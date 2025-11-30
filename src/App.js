import React, { useState, useEffect } from 'react';
import { AlertCircle, Zap, Shield, BarChart3 } from 'lucide-react';

const GRID_SIZE = 8;
const FIGURE_SIZE = 5;

const BlockBlasterSolver = () => {
  const [grid, setGrid] = useState(Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false)));
  const [figures, setFigures] = useState([
    Array(FIGURE_SIZE).fill().map(() => Array(FIGURE_SIZE).fill(false)),
    Array(FIGURE_SIZE).fill().map(() => Array(FIGURE_SIZE).fill(false)),
    Array(FIGURE_SIZE).fill().map(() => Array(FIGURE_SIZE).fill(false))
  ]);
  const [solution, setSolution] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [solutionStats, setSolutionStats] = useState(null);
  const [strategy, setStrategy] = useState('balanced'); // 'aggressive', 'conservative', 'balanced'
  
  // Mouse drag state for grid
  const [isGridDragging, setIsGridDragging] = useState(false);
  const [gridDragValue, setGridDragValue] = useState(null);
  
  // Mouse drag state for figures
  const [isFigureDragging, setIsFigureDragging] = useState(false);
  const [figureDragIndex, setFigureDragIndex] = useState(null);
  const [figureDragValue, setFigureDragValue] = useState(null);

  // Keyboard shortcut for solving
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && !isCalculating) {
        e.preventDefault();
        solvePuzzle();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isCalculating, grid, figures, strategy]);

  // Grid drag handlers
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

  // Figure drag handlers
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

  // Add global mouse up listener
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
        if (figure[r][c]) {
          cells.push([r, c]);
        }
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
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE || grid[r][c]) {
        return false;
      }
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
    
    for (let r = 0; r < GRID_SIZE; r++) {
      if (newGrid[r].every(cell => cell)) {
        clearedRows.add(r);
      }
    }
    
    for (let c = 0; c < GRID_SIZE; c++) {
      if (newGrid.every(row => row[c])) {
        clearedCols.add(c);
      }
    }
    
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (clearedRows.has(r) || clearedCols.has(c)) {
          newGrid[r][c] = false;
        }
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
    
    let emptyRows = 0;
    let emptyCols = 0;
    
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r].every(cell => !cell)) emptyRows++;
    }
    
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid.every(row => !row[c])) emptyCols++;
    }
    
    let fragmentationPenalty = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c]) {
          let neighbors = 0;
          if (r > 0 && grid[r-1][c]) neighbors++;
          if (r < GRID_SIZE-1 && grid[r+1][c]) neighbors++;
          if (c > 0 && grid[r][c-1]) neighbors++;
          if (c < GRID_SIZE-1 && grid[r][c+1]) neighbors++;
          
          if (neighbors === 0) fragmentationPenalty += 5;
          else if (neighbors === 1) fragmentationPenalty += 2;
        }
      }
    }
    
    let maxConsecutiveInRow = 0;
    let maxConsecutiveInCol = 0;
    
    for (let r = 0; r < GRID_SIZE; r++) {
      let consecutive = 0;
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c]) consecutive++;
        else {
          maxConsecutiveInRow = Math.max(maxConsecutiveInRow, consecutive);
          consecutive = 0;
        }
      }
      maxConsecutiveInRow = Math.max(maxConsecutiveInRow, consecutive);
    }
    
    for (let c = 0; c < GRID_SIZE; c++) {
      let consecutive = 0;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r][c]) consecutive++;
        else {
          maxConsecutiveInCol = Math.max(maxConsecutiveInCol, consecutive);
          consecutive = 0;
        }
      }
      maxConsecutiveInCol = Math.max(maxConsecutiveInCol, consecutive);
    }
    
    // Strategy-based scoring weights
    if (strategyType === 'aggressive') {
      // Aggressive: Focus on clearing lines NOW, less concern about board state
      score -= filledCells * 1; // Less penalty for filled cells
      score += emptyRows * 10;
      score += emptyCols * 10;
      score -= fragmentationPenalty * 0.5; // Less concern about fragmentation
      score += maxConsecutiveInRow * 5; // More reward for consecutive blocks
      score += maxConsecutiveInCol * 5;
    } else if (strategyType === 'conservative') {
      // Conservative: Prioritize clean board and safety
      score -= filledCells * 4; // Heavy penalty for filled cells
      score += emptyRows * 25; // High reward for empty rows
      score += emptyCols * 25; // High reward for empty columns
      score -= fragmentationPenalty * 3; // Heavy penalty for fragmentation
      score += maxConsecutiveInRow * 2;
      score += maxConsecutiveInCol * 2;
    } else { // balanced
      score -= filledCells * 2;
      score += emptyRows * 15;
      score += emptyCols * 15;
      score -= fragmentationPenalty;
      score += maxConsecutiveInRow * 3;
      score += maxConsecutiveInCol * 3;
    }
    
    return score;
  };

  const scoreSolution = (moves, strategyType) => {
    let totalScore = 0;
    let totalLinesCleared = 0;
    let finalBoardScore = 0;
    
    moves.forEach((move, idx) => {
      totalLinesCleared += move.linesCleared;
      
      // Strategy-based line clearing rewards
      if (strategyType === 'aggressive') {
        totalScore += move.linesCleared * 150; // Higher immediate reward
        // Big bonus for clearing lines early
        totalScore += (moves.length - idx) * 20;
      } else if (strategyType === 'conservative') {
        totalScore += move.linesCleared * 80; // Lower immediate reward
        // Smaller bonus for early clears
        totalScore += (moves.length - idx) * 5;
      } else { // balanced
        totalScore += move.linesCleared * 100;
        totalScore += (moves.length - idx) * 10;
      }
    });
    
    if (moves.length > 0) {
      const finalGrid = moves[moves.length - 1].gridAfter;
      finalBoardScore = scoreBoard(finalGrid, strategyType);
      
      // Strategy-based final board weight
      if (strategyType === 'aggressive') {
        totalScore += finalBoardScore * 0.5; // Less weight on final board
      } else if (strategyType === 'conservative') {
        totalScore += finalBoardScore * 2; // Heavy weight on final board
      } else { // balanced
        totalScore += finalBoardScore;
      }
    }
    
    return {
      totalScore,
      totalLinesCleared,
      finalBoardScore,
      avgLinesPerMove: totalLinesCleared / moves.length
    };
  };

  const solvePuzzle = async () => {
    setIsCalculating(true);
    
    setTimeout(() => {
      const figureShapes = figures.map(extractFigureShape).filter(f => f.length > 0);
      
      if (figureShapes.length === 0) {
        alert('Please add at least one figure');
        setIsCalculating(false);
        return;
      }

      const allSolutions = [];
      
      const permutations = [];
      const generatePermutations = (arr, current = []) => {
        if (current.length === arr.length) {
          permutations.push([...current]);
          return;
        }
        for (let i = 0; i < arr.length; i++) {
          if (!current.includes(i)) {
            current.push(i);
            generatePermutations(arr, current);
            current.pop();
          }
        }
      };
      generatePermutations(figureShapes);

      for (const perm of permutations) {
        const findMoves = (currentGrid, remainingIndices, moves) => {
          if (remainingIndices.length === 0) {
            if (moves.length > 0) {
              const stats = scoreSolution(moves, strategy);
              allSolutions.push({ moves: [...moves], stats });
            }
            return;
          }

          const figIdx = remainingIndices[0];
          const figure = figureShapes[perm[figIdx]];
          const originalFigureIdx = perm[figIdx];
          
          for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
              if (canPlaceFigure(currentGrid, figure, r, c)) {
                const gridAfterPlace = placeFigure(currentGrid, figure, r, c);
                const { grid: gridAfterClear, linesCleared, clearedRows, clearedCols } = clearCompleteLines(gridAfterPlace);
                
                const move = {
                  figureIndex: originalFigureIdx,
                  figure: figure,
                  row: r,
                  col: c,
                  gridBefore: currentGrid.map(row => [...row]),
                  gridAfterPlace: gridAfterPlace.map(row => [...row]),
                  gridAfter: gridAfterClear.map(row => [...row]),
                  linesCleared,
                  clearedRows,
                  clearedCols
                };
                
                findMoves(gridAfterClear, remainingIndices.slice(1), [...moves, move]);
              }
            }
          }
        };

        findMoves(grid, perm.map((_, i) => i), []);
      }

      if (allSolutions.length > 0) {
        allSolutions.sort((a, b) => b.stats.totalScore - a.stats.totalScore);
        
        const bestSolution = allSolutions[0];
        setSolution(bestSolution.moves);
        setSolutionStats(bestSolution.stats);
        setCurrentStep(0);
      } else {
        alert('No solution found for the current configuration');
      }
      
      setIsCalculating(false);
    }, 100);
  };

  const continueManually = () => {
    if (!solution || currentStep >= solution.length) return;
    
    setGrid(solution[currentStep].gridAfter.map(row => [...row]));
    setCurrentStep(currentStep + 1);
    
    if (currentStep + 1 >= solution.length) {
      setSolution(null);
      setCurrentStep(0);
      setSolutionStats(null);
    }
    
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetGrid = () => {
    setGrid(Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false)));
    setSolution(null);
    setCurrentStep(0);
    setSolutionStats(null);
  };

  const resetFigures = () => {
    setFigures([
      Array(FIGURE_SIZE).fill().map(() => Array(FIGURE_SIZE).fill(false)),
      Array(FIGURE_SIZE).fill().map(() => Array(FIGURE_SIZE).fill(false)),
      Array(FIGURE_SIZE).fill().map(() => Array(FIGURE_SIZE).fill(false))
    ]);
    setSolution(null);
    setCurrentStep(0);
    setSolutionStats(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">Block Blaster Solver</h1>
        
        {/* Strategy Selector */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Strategy Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setStrategy('aggressive')}
              className={`p-4 rounded-lg border-2 transition-all ${
                strategy === 'aggressive'
                  ? 'border-red-500 bg-red-50 shadow-lg'
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <div className="flex items-center justify-center mb-2">
                <Zap className={`w-6 h-6 ${strategy === 'aggressive' ? 'text-red-500' : 'text-gray-400'}`} />
              </div>
              <h3 className="font-bold text-lg mb-1">Aggressive</h3>
              <p className="text-sm text-gray-600">Maximize points NOW. Focus on clearing as many lines as possible immediately.</p>
            </button>
            
            <button
              onClick={() => setStrategy('balanced')}
              className={`p-4 rounded-lg border-2 transition-all ${
                strategy === 'balanced'
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-center mb-2">
                <BarChart3 className={`w-6 h-6 ${strategy === 'balanced' ? 'text-blue-500' : 'text-gray-400'}`} />
              </div>
              <h3 className="font-bold text-lg mb-1">Balanced</h3>
              <p className="text-sm text-gray-600">Mix of both strategies. Balance immediate points with board safety.</p>
            </button>
            
            <button
              onClick={() => setStrategy('conservative')}
              className={`p-4 rounded-lg border-2 transition-all ${
                strategy === 'conservative'
                  ? 'border-green-500 bg-green-50 shadow-lg'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="flex items-center justify-center mb-2">
                <Shield className={`w-6 h-6 ${strategy === 'conservative' ? 'text-green-500' : 'text-gray-400'}`} />
              </div>
              <h3 className="font-bold text-lg mb-1">Conservative</h3>
              <p className="text-sm text-gray-600">Prioritize board safety. Keep the board as clean and organized as possible.</p>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Grid Input */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Grid Input</h2>
              <button
                onClick={resetGrid}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Reset Grid
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Click or drag to fill squares</p>
            <div className="inline-block border-4 border-gray-300 rounded select-none">
              {grid.map((row, rowIdx) => (
                <div key={rowIdx} className="flex">
                  {row.map((cell, colIdx) => (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      onMouseDown={() => handleGridMouseDown(rowIdx, colIdx)}
                      onMouseEnter={() => handleGridMouseEnter(rowIdx, colIdx)}
                      className={`w-12 h-12 border border-white transition-colors cursor-pointer ${
                        cell ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Figures Input */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Figures Input</h2>
              <button
                onClick={resetFigures}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Reset Figures
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Click or drag to create shapes</p>
            <div className="grid grid-cols-3 gap-4">
              {figures.map((figure, figIdx) => (
                <div key={figIdx}>
                  <h3 className="text-lg font-medium mb-2 text-gray-700">Figure {figIdx + 1}</h3>
                  <div className="inline-block border-2 border-gray-300 rounded select-none">
                    {figure.map((row, rowIdx) => (
                      <div key={rowIdx} className="flex">
                        {row.map((cell, colIdx) => (
                          <div
                            key={`${figIdx}-${rowIdx}-${colIdx}`}
                            onMouseDown={() => handleFigureMouseDown(figIdx, rowIdx, colIdx)}
                            onMouseEnter={() => handleFigureMouseEnter(figIdx, rowIdx, colIdx)}
                            className={`w-8 h-8 border border-white transition-colors cursor-pointer ${
                              cell ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-200 hover:bg-gray-300'
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
        </div>

        {/* Solve Button */}
        <div className="text-center mb-8">
          <button
            onClick={solvePuzzle}
            disabled={isCalculating}
            className={`px-8 py-4 text-white text-xl font-semibold rounded-lg transition shadow-lg ${
              isCalculating 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isCalculating ? 'Calculating Best Move...' : 'Solve Manual Input'}
          </button>
          <p className="mt-3 text-sm text-gray-600">
            💡 Tip: Press <kbd className="px-2 py-1 bg-gray-200 rounded border border-gray-300">Space</kbd> to solve quickly!
          </p>
          {isCalculating && (
            <p className="mt-3 text-gray-600">Analyzing all possible combinations for optimal {strategy} solution...</p>
          )}
        </div>

        {/* Solution Stats */}
        {solutionStats && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-lg p-6 mb-8 border-2 border-green-300">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              🏆 Optimal {strategy.charAt(0).toUpperCase() + strategy.slice(1)} Solution Found!
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600">Total Score</p>
                <p className="text-3xl font-bold text-green-600">{solutionStats.totalScore}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600">Lines Cleared</p>
                <p className="text-3xl font-bold text-blue-600">{solutionStats.totalLinesCleared}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600">Board Cleanliness</p>
                <p className="text-3xl font-bold text-purple-600">{solutionStats.finalBoardScore}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600">Efficiency</p>
                <p className="text-3xl font-bold text-orange-600">{solutionStats.avgLinesPerMove.toFixed(1)}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-700">
              {strategy === 'aggressive' && '⚡ Aggressive mode: Maximizing immediate line clears and points!'}
              {strategy === 'balanced' && '⚖️ Balanced mode: Optimizing both immediate points and board safety!'}
              {strategy === 'conservative' && '🛡️ Conservative mode: Prioritizing board cleanliness and future move potential!'}
            </p>
          </div>
        )}

        {/* Solution Display */}
        {solution && solution.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Step-by-Step Solution</h2>
            
            {solution.map((move, idx) => (
              <div key={idx} className="mb-8 p-6 bg-white border-2 border-gray-200 rounded-lg">
                <h3 className="text-2xl font-bold mb-4 text-gray-800">
                  Step {idx + 1}
                </h3>
                
                <div className="inline-block border-4 border-gray-400 rounded-lg overflow-hidden">
                  {move.gridAfterPlace.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex">
                      {row.map((cell, colIdx) => {
                        const wasPlaced = move.figure.some(([dr, dc]) => 
                          move.row + dr === rowIdx && move.col + dc === colIdx
                        );
                        
                        const willBeCleared = cell && 
                                            (move.clearedRows.includes(rowIdx) || 
                                             move.clearedCols.includes(colIdx));
                        
                        return (
                          <div
                            key={`${rowIdx}-${colIdx}`}
                            className={`w-12 h-12 border-2 border-white relative ${
                              wasPlaced ? 'bg-blue-500' : 
                              cell ? 'bg-red-500' : 'bg-green-500'
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
                
                <p className="mt-4 text-lg text-gray-700">
                  <span className="font-semibold">Completed lines: {move.linesCleared}</span>
                </p>
              </div>
            ))}

            {currentStep < solution.length ? (
              <div className="text-center mt-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-300">
                <p className="text-2xl font-bold mb-6 text-blue-800">Ready for next turn!</p>
                <p className="text-lg mb-6 text-gray-700">
                  Upload another screenshot or fill manually to continue solving.
                </p>
                <button
                  onClick={continueManually}
                  className="px-8 py-4 bg-green-500 text-white text-xl font-semibold rounded-lg hover:bg-green-600 transition shadow-lg mr-4"
                >
                  Continue Manually
                </button>
              </div>
            ) : (
              <div className="text-center mt-8 p-6 bg-green-100 rounded-lg border-2 border-green-300">
                <p className="text-2xl font-bold text-green-800">All moves completed! 🎉</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockBlasterSolver;
