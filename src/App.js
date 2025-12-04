import React, { useState, useEffect } from 'react';
import { Zap, Shield, BarChart3 } from 'lucide-react';

const FIGURE_SIZE = 5;

const BlockBlasterSolver = () => {
  const [gridSize, setGridSize] = useState(8);
  const [gridSizeInput, setGridSizeInput] = useState('8x8');
  const [numFigures, setNumFigures] = useState(3);
  const [grid, setGrid] = useState(Array(8).fill().map(() => Array(8).fill(false)));
  const [figures, setFigures] = useState([
    Array(FIGURE_SIZE).fill().map(() => Array(FIGURE_SIZE).fill(false)),
    Array(FIGURE_SIZE).fill().map(() => Array(FIGURE_SIZE).fill(false)),
    Array(FIGURE_SIZE).fill().map(() => Array(FIGURE_SIZE).fill(false))
  ]);
  const [solution, setSolution] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [solutionStats, setSolutionStats] = useState(null);
  const [strategy, setStrategy] = useState('balanced');
  
  const [isGridDragging, setIsGridDragging] = useState(false);
  const [gridDragValue, setGridDragValue] = useState(null);
  
  const [isFigureDragging, setIsFigureDragging] = useState(false);
  const [figureDragIndex, setFigureDragIndex] = useState(null);
  const [figureDragValue, setFigureDragValue] = useState(null);

  const handleGridSizeChange = () => {
    const match = gridSizeInput.match(/^(\d+)x(\d+)$/i);
    if (match) {
      const rows = parseInt(match[1]);
      const cols = parseInt(match[2]);
      if (rows > 0 && rows <= 20 && cols > 0 && cols <= 20 && rows === cols) {
        setGridSize(rows);
        setGrid(Array(rows).fill().map(() => Array(rows).fill(false)));
        setSolution(null);
        setCurrentStep(0);
        setSolutionStats(null);
      } else {
        alert('Please enter a square grid size between 1x1 and 20x20');
      }
    } else {
      alert('Please enter grid size in format: NxN (e.g., 8x8, 10x10)');
    }
  };

  const handleNumFiguresChange = (num) => {
    const newNum = Math.max(1, Math.min(5, num));
    setNumFigures(newNum);
    
    const newFigures = [];
    for (let i = 0; i < newNum; i++) {
      if (i < figures.length) {
        newFigures.push(figures[i]);
      } else {
        newFigures.push(Array(FIGURE_SIZE).fill().map(() => Array(FIGURE_SIZE).fill(false)));
      }
    }
    setFigures(newFigures);
    setSolution(null);
    setCurrentStep(0);
    setSolutionStats(null);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && !isCalculating) {
        e.preventDefault();
        solvePuzzle();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isCalculating, grid, figures, strategy, gridSize]);

  const handleGridMouseDown = (row, col) => {
    setIsGridDragging(true);
    const newValue = !grid[row][col];
    setGridDragValue(newValue);
    toggleGridCell(row, col, newValue);
  };

  const handleGridMouseEnter = (row, col) => {
    if (isGridDragging && gridDragValue !== null) {
      const newGrid = grid.map(r => [...r]);
      newGrid[row][col] = gridDragValue;
      setGrid(newGrid);
      setSolution(null);
      setCurrentStep(0);
      setSolutionStats(null);
    }
  };

  const handleGridMouseUp = () => {
    setIsGridDragging(false);
    setGridDragValue(null);
  };

  const handleFigureMouseDown = (figureIndex, row, col) => {
    setIsFigureDragging(true);
    setFigureDragIndex(figureIndex);
    const newValue = !figures[figureIndex][row][col];
    setFigureDragValue(newValue);
    toggleFigureCell(figureIndex, row, col, newValue);
  };

  const handleFigureMouseEnter = (figureIndex, row, col) => {
    if (isFigureDragging && figureDragIndex === figureIndex && figureDragValue !== null) {
      const newFigures = figures.map(f => f.map(r => [...r]));
      newFigures[figureIndex][row][col] = figureDragValue;
      setFigures(newFigures);
      setSolution(null);
      setCurrentStep(0);
      setSolutionStats(null);
    }
  };

  const handleFigureMouseUp = () => {
    setIsFigureDragging(false);
    setFigureDragIndex(null);
    setFigureDragValue(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      handleGridMouseUp();
      handleFigureMouseUp();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const toggleGridCell = (row, col, forceValue = null) => {
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = forceValue !== null ? forceValue : !newGrid[row][col];
    setGrid(newGrid);
    setSolution(null);
    setCurrentStep(0);
    setSolutionStats(null);
  };

  const toggleFigureCell = (figureIndex, row, col, forceValue = null) => {
    const newFigures = figures.map(f => f.map(r => [...r]));
    newFigures[figureIndex][row][col] = forceValue !== null ? forceValue : !newFigures[figureIndex][row][col];
    setFigures(newFigures);
    setSolution(null);
    setCurrentStep(0);
    setSolutionStats(null);
  };

  const extractFigureShape = (figure) => {
    const cells = [];
    for (let r = 0; r < FIGURE_SIZE; r++) {
      for (let c = 0; c < FIGURE_SIZE; c++) {
        if (figure[r][c]) cells.push([r, c]);
      }
    }
    if (cells.length === 0) return [];
    const minRow = Math.min(...cells.map(c => c[0]));
    const minCol = Math.min(...cells.map(c => c[1]));
    return cells.map(([r, c]) => [r - minRow, c - minCol]);
  };

  const canPlaceFigure = (grid, figure, startRow, startCol) => {
    for (const [dr, dc] of figure) {
      const r = startRow + dr;
      const c = startCol + dc;
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize || grid[r][c]) return false;
    }
    return true;
  };

  const placeFigure = (grid, figure, startRow, startCol) => {
    const newGrid = grid.map(r => [...r]);
    for (const [dr, dc] of figure) {
      newGrid[startRow + dr][startCol + dc] = true;
    }
    return newGrid;
  };

  const clearCompleteLines = (grid) => {
    let newGrid = grid.map(r => [...r]);
    const clearedRows = new Set();
    const clearedCols = new Set();
    
    for (let r = 0; r < gridSize; r++) {
      if (newGrid[r].every(cell => cell)) clearedRows.add(r);
    }
    for (let c = 0; c < gridSize; c++) {
      if (newGrid.every(row => row[c])) clearedCols.add(c);
    }
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (clearedRows.has(r) || clearedCols.has(c)) newGrid[r][c] = false;
      }
    }
    
    return { 
      grid: newGrid, 
      linesCleared: clearedRows.size + clearedCols.size,
      clearedRows: Array.from(clearedRows),
      clearedCols: Array.from(clearedCols)
    };
  };

  const scoreBoard = (grid, strategyType) => {
    let score = 0;
    const filledCells = grid.flat().filter(cell => cell).length;
    let emptyRows = 0, emptyCols = 0;
    
    for (let r = 0; r < gridSize; r++) {
      if (grid[r].every(cell => !cell)) emptyRows++;
    }
    for (let c = 0; c < gridSize; c++) {
      if (grid.every(row => !row[c])) emptyCols++;
    }
    
    let fragmentationPenalty = 0;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c]) {
          let neighbors = 0;
          if (r > 0 && grid[r-1][c]) neighbors++;
          if (r < gridSize-1 && grid[r+1][c]) neighbors++;
          if (c > 0 && grid[r][c-1]) neighbors++;
          if (c < gridSize-1 && grid[r][c+1]) neighbors++;
          if (neighbors === 0) fragmentationPenalty += 5;
          else if (neighbors === 1) fragmentationPenalty += 2;
        }
      }
    }
    
    if (strategyType === 'aggressive') {
      score = -filledCells + emptyRows * 10 + emptyCols * 10 - fragmentationPenalty * 0.5;
    } else if (strategyType === 'conservative') {
      score = -filledCells * 4 + emptyRows * 25 + emptyCols * 25 - fragmentationPenalty * 3;
    } else {
      score = -filledCells * 2 + emptyRows * 15 + emptyCols * 15 - fragmentationPenalty;
    }
    return score;
  };

  const scoreSolution = (moves, strategyType) => {
    let totalScore = 0;
    let totalLinesCleared = 0;
    
    moves.forEach((move, idx) => {
      totalLinesCleared += move.linesCleared;
      if (strategyType === 'aggressive') {
        totalScore += move.linesCleared * 150 + (moves.length - idx) * 20;
      } else if (strategyType === 'conservative') {
        totalScore += move.linesCleared * 80 + (moves.length - idx) * 5;
      } else {
        totalScore += move.linesCleared * 100 + (moves.length - idx) * 10;
      }
    });
    
    if (moves.length > 0) {
      const finalGrid = moves[moves.length - 1].gridAfter;
      const finalBoardScore = scoreBoard(finalGrid, strategyType);
      if (strategyType === 'aggressive') totalScore += finalBoardScore * 0.5;
      else if (strategyType === 'conservative') totalScore += finalBoardScore * 2;
      else totalScore += finalBoardScore;
    }
    
    return {
      totalScore,
      totalLinesCleared,
      avgLinesPerMove: totalLinesCleared / moves.length
    };
  };

  const solvePuzzle = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const figureShapes = figures.map(extractFigureShape).filter(f => f.length > 0);
      if (figureShapes.length === 0) {
        alert('Please add at least one figure');
        setIsCalculating(false);
        return;
      }

      let bestSolution = null;
      let bestScore = -Infinity;

      const findMoves = (currentGrid, remainingFigures, usedIndices, moves) => {
        if (remainingFigures.length === 0) {
          if (moves.length > 0) {
            const stats = scoreSolution(moves, strategy);
            if (stats.totalScore > bestScore) {
              bestScore = stats.totalScore;
              bestSolution = { moves: [...moves], stats };
            }
          }
          return;
        }

        for (let figIdx = 0; figIdx < remainingFigures.length; figIdx++) {
          const figure = remainingFigures[figIdx];
          const originalFigureIdx = usedIndices[figIdx];
          
          for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
              if (canPlaceFigure(currentGrid, figure, r, c)) {
                const gridAfterPlace = placeFigure(currentGrid, figure, r, c);
                const { grid: gridAfterClear, linesCleared, clearedRows, clearedCols } = clearCompleteLines(gridAfterPlace);
                
                const move = {
                  figureIndex: originalFigureIdx,
                  figure,
                  row: r,
                  col: c,
                  gridBefore: currentGrid.map(row => [...row]),
                  gridAfterPlace: gridAfterPlace.map(row => [...row]),
                  gridAfter: gridAfterClear.map(row => [...row]),
                  linesCleared,
                  clearedRows,
                  clearedCols
                };
                
                const newRemaining = remainingFigures.filter((_, i) => i !== figIdx);
                const newUsedIndices = usedIndices.filter((_, i) => i !== figIdx);
                
                findMoves(gridAfterClear, newRemaining, newUsedIndices, [...moves, move]);
              }
            }
          }
        }
      };

      const figureIndices = figureShapes.map((_, i) => i);
      findMoves(grid, figureShapes, figureIndices, []);

      if (bestSolution) {
        setSolution(bestSolution.moves);
        setSolutionStats(bestSolution.stats);
        setCurrentStep(0);
      } else {
        alert('No solution found');
      }
      setIsCalculating(false);
    }, 50);
  };

  const continueManually = () => {
    if (!solution || solution.length === 0) return;
    let currentGrid = grid.map(row => [...row]);
    for (const move of solution) {
      currentGrid = placeFigure(currentGrid, move.figure, move.row, move.col);
      const { grid: clearedGrid } = clearCompleteLines(currentGrid);
      currentGrid = clearedGrid;
    }
    setGrid(currentGrid);
    
    // Reset all figures that were used in the solution
    const newFigures = figures.map((figure, idx) => {
      // Check if this figure was used in the solution
      const wasUsed = solution.some(move => move.figureIndex === idx);
      if (wasUsed) {
        // Reset this figure to empty
        return Array(FIGURE_SIZE).fill().map(() => Array(FIGURE_SIZE).fill(false));
      }
      // Keep unused figures as they are
      return figure;
    });
    setFigures(newFigures);
    
    setSolution(null);
    setCurrentStep(0);
    setSolutionStats(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetGrid = () => {
    setGrid(Array(gridSize).fill().map(() => Array(gridSize).fill(false)));
    setSolution(null);
    setCurrentStep(0);
    setSolutionStats(null);
  };

  const resetFigures = () => {
    const newFigures = [];
    for (let i = 0; i < numFigures; i++) {
      newFigures.push(Array(FIGURE_SIZE).fill().map(() => Array(FIGURE_SIZE).fill(false)));
    }
    setFigures(newFigures);
    setSolution(null);
    setCurrentStep(0);
    setSolutionStats(null);
  };

  const cellSize = gridSize <= 8 ? 'w-12 h-12' : gridSize <= 12 ? 'w-10 h-10' : 'w-8 h-8';

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">Block Blaster Solver</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Grid Configuration</h2>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grid Size</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gridSizeInput}
                  onChange={(e) => setGridSizeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGridSizeChange()}
                  placeholder="8x8"
                  className="px-4 py-2 border-2 border-gray-300 rounded w-32"
                />
                <button onClick={handleGridSizeChange} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Apply
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Figures (1-5)</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleNumFiguresChange(numFigures - 1)}
                  disabled={numFigures <= 1}
                  className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
                >
                  -
                </button>
                <span className="px-4 py-2 bg-gray-100 rounded font-semibold">{numFigures}</span>
                <button
                  onClick={() => handleNumFiguresChange(numFigures + 1)}
                  disabled={numFigures >= 5}
                  className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Strategy Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['aggressive', 'balanced', 'conservative'].map(strat => (
              <button
                key={strat}
                onClick={() => setStrategy(strat)}
                className={`p-4 rounded-lg border-2 ${strategy === strat ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
              >
                <h3 className="font-bold text-lg capitalize">{strat}</h3>
              </button>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Grid Input</h2>
            <button onClick={resetGrid} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
              Reset
            </button>
          </div>
          <div className="inline-block border-4 border-gray-300 rounded select-none">
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} className="flex">
                {row.map((cell, colIdx) => (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    onMouseDown={() => handleGridMouseDown(rowIdx, colIdx)}
                    onMouseEnter={() => handleGridMouseEnter(rowIdx, colIdx)}
                    className={`${cellSize} border border-white cursor-pointer ${
                      cell ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Figures</h2>
            <button onClick={resetFigures} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
              Reset
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {figures.map((figure, figIdx) => (
              <div key={figIdx}>
                <h3 className="text-lg font-medium mb-2">Figure {figIdx + 1}</h3>
                <div className="inline-block border-2 border-gray-300 rounded select-none">
                  {figure.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex">
                      {row.map((cell, colIdx) => (
                        <div
                          key={`${figIdx}-${rowIdx}-${colIdx}`}
                          onMouseDown={() => handleFigureMouseDown(figIdx, rowIdx, colIdx)}
                          onMouseEnter={() => handleFigureMouseEnter(figIdx, rowIdx, colIdx)}
                          className={`w-8 h-8 border border-white cursor-pointer ${
                            cell ? 'bg-blue-500' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mb-8">
          <button
            onClick={solvePuzzle}
            disabled={isCalculating}
            className={`px-8 py-4 text-white text-xl font-semibold rounded-lg shadow-lg ${
              isCalculating ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isCalculating ? 'Calculating...' : 'Solve'}
          </button>
          <p className="mt-3 text-sm text-gray-600">Press <kbd className="px-2 py-1 bg-gray-200 rounded">Space</kbd> to solve</p>
        </div>

        {solutionStats && (
          <div className="bg-green-50 rounded-lg p-6 mb-8 border-2 border-green-300">
            <h2 className="text-2xl font-bold mb-4">🏆 Solution Found!</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded p-4">
                <p className="text-sm text-gray-600">Score</p>
                <p className="text-3xl font-bold text-green-600">{Math.round(solutionStats.totalScore)}</p>
              </div>
              <div className="bg-white rounded p-4">
                <p className="text-sm text-gray-600">Lines</p>
                <p className="text-3xl font-bold text-blue-600">{solutionStats.totalLinesCleared}</p>
              </div>
              <div className="bg-white rounded p-4">
                <p className="text-sm text-gray-600">Efficiency</p>
                <p className="text-3xl font-bold text-orange-600">{solutionStats.avgLinesPerMove.toFixed(1)}</p>
              </div>
            </div>
          </div>
        )}

        {solution && solution.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6">Steps</h2>
            {solution.map((move, idx) => (
              <div key={idx} className="mb-8 p-6 border-2 border-gray-200 rounded-lg">
                <h3 className="text-2xl font-bold mb-4">Step {idx + 1}</h3>
                <div className="inline-block border-4 border-gray-400 rounded-lg overflow-hidden">
                  {move.gridAfterPlace.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex">
                      {row.map((cell, colIdx) => {
                        const wasPlaced = move.figure.some(([dr, dc]) => 
                          move.row + dr === rowIdx && move.col + dc === colIdx
                        );
                        const willBeCleared = move.gridAfterPlace[rowIdx][colIdx] && 
                          (move.clearedRows.includes(rowIdx) || move.clearedCols.includes(colIdx));
                        
                        return (
                          <div
                            key={`${rowIdx}-${colIdx}`}
                            className={`${cellSize} border-2 border-white relative ${
                              wasPlaced ? 'bg-blue-500' : cell ? 'bg-red-500' : 'bg-green-500'
                            }`}
                          >
                            {willBeCleared && (
                              <div className="absolute inset-1 bg-purple-400 rounded-full opacity-70"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-lg">
                  <span className="font-semibold">Completed lines: {move.linesCleared}</span>
                </p>
              </div>
            ))}

            <div className="text-center mt-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-300">
              <p className="text-2xl font-bold mb-6">Apply all moves!</p>
              <button
                onClick={continueManually}
                className="px-8 py-4 bg-green-500 text-white text-xl font-semibold rounded-lg hover:bg-green-600"
              >
                Apply All Moves & Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockBlasterSolver;
