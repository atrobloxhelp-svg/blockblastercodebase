import React, { useState, useEffect } from 'react';

const FIGURE_SIZE = 5;

const BlockBlasterSolver = () => {
  const [gridSize, setGridSize] = useState(8);
  const [gridSizeInput, setGridSizeInput] = useState('8x8');
  const [numFigures, setNumFigures] = useState(3);
  const [grid, setGrid] = useState(Array(8).fill(null).map(() => Array(8).fill(false)));
  const [figures, setFigures] = useState([
    Array(FIGURE_SIZE).fill(null).map(() => Array(FIGURE_SIZE).fill(false)),
    Array(FIGURE_SIZE).fill(null).map(() => Array(FIGURE_SIZE).fill(false)),
    Array(FIGURE_SIZE).fill(null).map(() => Array(FIGURE_SIZE).fill(false)),
  ]);
  const [solution, setSolution] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [solutionStats, setSolutionStats] = useState(null);
  const [evalScore, setEvalScore] = useState(0);

  const [isGridDragging, setIsGridDragging] = useState(false);
  const [gridDragValue, setGridDragValue] = useState(null);
  const [isFigureDragging, setIsFigureDragging] = useState(false);
  const [figureDragIndex, setFigureDragIndex] = useState(null);
  const [figureDragValue, setFigureDragValue] = useState(null);

  const gridToFlat = (grid2d, gs) => {
    const flat = new Array(gs * gs).fill(0);
    for (let r = 0; r < gs; r++)
      for (let c = 0; c < gs; c++)
        if (grid2d[r][c]) flat[r * gs + c] = 1;
    return flat;
  };

  const flatToGrid = (flat, gs) => {
    const g = [];
    for (let r = 0; r < gs; r++)
      g.push(Array.from(flat.slice(r * gs, r * gs + gs), v => v === 1));
    return g;
  };

  const evaluateFlat = (flat, gs) => {
    let filled = 0;
    const rowFill = new Array(gs).fill(0);
    const colFill = new Array(gs).fill(0);

    for (let r = 0; r < gs; r++) {
      for (let c = 0; c < gs; c++) {
        if (flat[r * gs + c]) {
          filled++;
          rowFill[r]++;
          colFill[c]++;
        }
      }
    }

    let nearFullBonus = 0;
    for (let r = 0; r < gs; r++) {
      const gap = gs - rowFill[r];
      if (gap === 0) nearFullBonus += 200;
      else if (gap <= 2) nearFullBonus += (3 - gap) * 30;
    }
    for (let c = 0; c < gs; c++) {
      const gap = gs - colFill[c];
      if (gap === 0) nearFullBonus += 200;
      else if (gap <= 2) nearFullBonus += (3 - gap) * 30;
    }

    let adjacency = 0;
    for (let r = 0; r < gs; r++) {
      for (let c = 0; c < gs; c++) {
        if (flat[r * gs + c]) {
          if (r + 1 < gs && flat[(r + 1) * gs + c]) adjacency++;
          if (c + 1 < gs && flat[r * gs + c + 1]) adjacency++;
        }
      }
    }

    let isolation = 0;
    for (let r = 0; r < gs; r++) {
      for (let c = 0; c < gs; c++) {
        if (flat[r * gs + c]) {
          let n = 0;
          if (r > 0 && flat[(r - 1) * gs + c]) n++;
          if (r + 1 < gs && flat[(r + 1) * gs + c]) n++;
          if (c > 0 && flat[r * gs + c - 1]) n++;
          if (c + 1 < gs && flat[r * gs + c + 1]) n++;
          if (n === 0) isolation += 8;
        }
      }
    }

    return nearFullBonus + adjacency * 2 - isolation - filled * 3;
  };

  const placeFigureFlat = (flat, figure, startRow, startCol, gs) => {
    const next = flat.slice();
    for (const [dr, dc] of figure) {
      next[(startRow + dr) * gs + (startCol + dc)] = 1;
    }
    return next;
  };

  const clearCompleteLinesFlat = (flat, gs) => {
    const next = flat.slice();
    const clearedRows = [];
    const clearedCols = [];

    for (let r = 0; r < gs; r++) {
      let full = true;
      for (let c = 0; c < gs; c++) {
        if (!next[r * gs + c]) { full = false; break; }
      }
      if (full) clearedRows.push(r);
    }
    for (let c = 0; c < gs; c++) {
      let full = true;
      for (let r = 0; r < gs; r++) {
        if (!next[r * gs + c]) { full = false; break; }
      }
      if (full) clearedCols.push(c);
    }
    for (const r of clearedRows) for (let c = 0; c < gs; c++) next[r * gs + c] = 0;
    for (const c of clearedCols) for (let r = 0; r < gs; r++) next[r * gs + c] = 0;

    return { flat: next, linesCleared: clearedRows.length + clearedCols.length, clearedRows, clearedCols };
  };

  const canPlaceFigureFlat = (flat, figure, startRow, startCol, gs) => {
    for (const [dr, dc] of figure) {
      const r = startRow + dr;
      const c = startCol + dc;
      if (r < 0 || r >= gs || c < 0 || c >= gs || flat[r * gs + c]) return false;
    }
    return true;
  };

  const scoreMove = (flat, figure, r, c, gs) => {
    const placed = placeFigureFlat(flat, figure, r, c, gs);
    const { flat: cleared, linesCleared } = clearCompleteLinesFlat(placed, gs);
    return linesCleared * 1000 + evaluateFlat(cleared, gs);
  };

  const generateOrderedMovesFlat = (flat, figure, gs) => {
    const moves = [];
    for (let r = 0; r < gs; r++) {
      for (let c = 0; c < gs; c++) {
        if (canPlaceFigureFlat(flat, figure, r, c, gs)) {
          moves.push({ r, c, score: scoreMove(flat, figure, r, c, gs) });
        }
      }
    }
    moves.sort((a, b) => b.score - a.score);
    return moves;
  };

  const search = (flat, figureShapes, figureIndices, gs, depth, alpha) => {
    if (figureShapes.length === 0) {
      return { score: evaluateFlat(flat, gs), moves: [] };
    }

    let best = null;
    let bestScore = alpha;

    for (let fi = 0; fi < figureShapes.length; fi++) {
      const figure = figureShapes[fi];
      const origIdx = figureIndices[fi];
      const orderedMoves = generateOrderedMovesFlat(flat, figure, gs);

      for (const { r, c } of orderedMoves) {
        const placed = placeFigureFlat(flat, figure, r, c, gs);
        const { flat: cleared, linesCleared, clearedRows, clearedCols } = clearCompleteLinesFlat(placed, gs);

        const immediateScore = linesCleared * 500;
        const childAlpha = bestScore - immediateScore;

        const remainingFigures = figureShapes.filter((_, i) => i !== fi);
        const remainingIndices = figureIndices.filter((_, i) => i !== fi);

        const child = search(cleared, remainingFigures, remainingIndices, gs, depth + 1, childAlpha);
        const totalScore = immediateScore + child.score;

        if (totalScore > bestScore) {
          bestScore = totalScore;
          best = {
            score: totalScore,
            moves: [
              {
                figureIndex: origIdx,
                figure,
                row: r,
                col: c,
                linesCleared,
                clearedRows,
                clearedCols,
                gridBeforeFlat: flat,
                gridAfterPlaceFlat: placed,
                gridAfterFlat: cleared,
              },
              ...child.moves,
            ],
          };
        }
      }
    }

    return best || { score: evaluateFlat(flat, gs), moves: [] };
  };

  const extractFigureShape = (figure) => {
    const cells = [];
    for (let r = 0; r < FIGURE_SIZE; r++)
      for (let c = 0; c < FIGURE_SIZE; c++)
        if (figure[r][c]) cells.push([r, c]);
    if (cells.length === 0) return [];
    const minRow = Math.min(...cells.map(cell => cell[0]));
    const minCol = Math.min(...cells.map(cell => cell[1]));
    return cells.map(([r, c]) => [r - minRow, c - minCol]);
  };

  useEffect(() => {
    const flat = gridToFlat(grid, gridSize);
    const raw = evaluateFlat(flat, gridSize);
    const normalized = Math.max(-1, Math.min(1, raw / 300));
    setEvalScore(normalized);
  }, [grid, gridSize]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && !isCalculating) {
        e.preventDefault();
        solvePuzzle();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isCalculating, grid, figures, gridSize]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsGridDragging(false);
      setGridDragValue(null);
      setIsFigureDragging(false);
      setFigureDragIndex(null);
      setFigureDragValue(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleGridSizeChange = () => {
    const match = gridSizeInput.match(/^(\d+)x(\d+)$/i);
    if (match) {
      const rows = parseInt(match[1]);
      const cols = parseInt(match[2]);
      if (rows > 0 && rows <= 20 && cols > 0 && cols <= 20 && rows === cols) {
        setGridSize(rows);
        setGrid(Array(rows).fill(null).map(() => Array(rows).fill(false)));
        setSolution(null);
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
      newFigures.push(
        i < figures.length
          ? figures[i]
          : Array(FIGURE_SIZE).fill(null).map(() => Array(FIGURE_SIZE).fill(false))
      );
    }
    setFigures(newFigures);
    setSolution(null);
    setSolutionStats(null);
  };

  const handleGridMouseDown = (row, col) => {
    const newValue = !grid[row][col];
    setIsGridDragging(true);
    setGridDragValue(newValue);
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = newValue;
    setGrid(newGrid);
    setSolution(null);
    setSolutionStats(null);
  };

  const handleGridMouseEnter = (row, col) => {
    if (!isGridDragging || gridDragValue === null) return;
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = gridDragValue;
    setGrid(newGrid);
    setSolution(null);
    setSolutionStats(null);
  };

  const handleFigureMouseDown = (figureIndex, row, col) => {
    const newValue = !figures[figureIndex][row][col];
    setIsFigureDragging(true);
    setFigureDragIndex(figureIndex);
    setFigureDragValue(newValue);
    const newFigures = figures.map(f => f.map(r => [...r]));
    newFigures[figureIndex][row][col] = newValue;
    setFigures(newFigures);
    setSolution(null);
    setSolutionStats(null);
  };

  const handleFigureMouseEnter = (figureIndex, row, col) => {
    if (!isFigureDragging || figureDragIndex !== figureIndex || figureDragValue === null) return;
    const newFigures = figures.map(f => f.map(r => [...r]));
    newFigures[figureIndex][row][col] = figureDragValue;
    setFigures(newFigures);
    setSolution(null);
    setSolutionStats(null);
  };

  const resetGrid = () => {
    setGrid(Array(gridSize).fill(null).map(() => Array(gridSize).fill(false)));
    setSolution(null);
    setSolutionStats(null);
  };

  const resetFigures = () => {
    setFigures(
      Array(numFigures).fill(null).map(() =>
        Array(FIGURE_SIZE).fill(null).map(() => Array(FIGURE_SIZE).fill(false))
      )
    );
    setSolution(null);
    setSolutionStats(null);
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

      const flat = gridToFlat(grid, gridSize);
      const figureIndices = figureShapes.map((_, i) => i);
      const result = search(flat, figureShapes, figureIndices, gridSize, 0, -Infinity);

      if (result && result.moves.length > 0) {
        const moves = result.moves.map(m => ({
          ...m,
          gridBefore: flatToGrid(m.gridBeforeFlat, gridSize),
          gridAfterPlace: flatToGrid(m.gridAfterPlaceFlat, gridSize),
          gridAfter: flatToGrid(m.gridAfterFlat, gridSize),
        }));
        const totalLinesCleared = moves.reduce((s, m) => s + m.linesCleared, 0);
        setSolution(moves);
        setSolutionStats({
          totalScore: Math.round(result.score),
          totalLinesCleared,
          avgLinesPerMove: totalLinesCleared / moves.length,
        });
      } else {
        alert('No valid placements found');
      }
      setIsCalculating(false);
    }, 50);
  };

  const continueManually = () => {
    if (!solution || solution.length === 0) return;
    const finalGrid = solution[solution.length - 1].gridAfter;
    setGrid(finalGrid);
    const newFigures = figures.map((figure, idx) => {
      const wasUsed = solution.some(move => move.figureIndex === idx);
      return wasUsed
        ? Array(FIGURE_SIZE).fill(null).map(() => Array(FIGURE_SIZE).fill(false))
        : figure;
    });
    setFigures(newFigures);
    setSolution(null);
    setSolutionStats(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cellSize = gridSize <= 8 ? 'w-12 h-12' : gridSize <= 12 ? 'w-10 h-10' : 'w-8 h-8';
  const cellPx = gridSize <= 8 ? 48 : gridSize <= 12 ? 40 : 32;
  const barHeight = gridSize * cellPx;
  const evalFillPct = Math.round(((evalScore + 1) / 2) * 100);
  const barColor = evalScore > 0.15
    ? 'linear-gradient(to top, #15803d, #4ade80)'
    : evalScore < -0.15
    ? 'linear-gradient(to top, #991b1b, #f87171)'
    : 'linear-gradient(to top, #92400e, #d97706)';

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Block Blast Engine 1.0.0.0
        </h1>

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
                <button
                  onClick={handleGridSizeChange}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Apply
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Figures (1–5)</label>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => handleNumFiguresChange(numFigures - 1)}
                  disabled={numFigures <= 1}
                  className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
                >
                  −
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Grid Input</h2>
            <button
              onClick={resetGrid}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Reset
            </button>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center" style={{ width: 24 }}>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#6b7280', marginBottom: 2 }}>+</span>
              <div
                style={{
                  width: 16,
                  height: barHeight,
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: '1px solid #9ca3af',
                  position: 'relative',
                  background: '#1f2937',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: `${evalFillPct}%`,
                    background: barColor,
                    transition: 'height 0.35s cubic-bezier(0.25,0.46,0.45,0.94), background 0.35s ease',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '50%',
                    borderTop: '2px solid rgba(255,255,255,0.5)',
                  }}
                />
              </div>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#6b7280', marginTop: 2 }}>−</span>
              <span
                style={{
                  fontSize: 8,
                  fontFamily: 'monospace',
                  color: '#374151',
                  marginTop: 6,
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  letterSpacing: 1,
                }}
              >
                EVAL
              </span>
            </div>

            <div
              className="inline-block border-4 border-gray-300 rounded select-none"
              style={{ lineHeight: 0 }}
            >
              {grid.map((row, rowIdx) => (
                <div key={rowIdx} className="flex">
                  {row.map((cell, colIdx) => (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      onMouseDown={() => handleGridMouseDown(rowIdx, colIdx)}
                      onMouseEnter={() => handleGridMouseEnter(rowIdx, colIdx)}
                      className={`${cellSize} border border-white cursor-pointer ${cell ? 'bg-red-500' : 'bg-green-500'}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Figures</h2>
            <button
              onClick={resetFigures}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Reset
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {figures.map((figure, figIdx) => (
              <div key={figIdx}>
                <h3 className="text-lg font-medium mb-2">Figure {figIdx + 1}</h3>
                <div
                  className="inline-block border-2 border-gray-300 rounded select-none"
                  style={{ lineHeight: 0 }}
                >
                  {figure.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex">
                      {row.map((cell, colIdx) => (
                        <div
                          key={`${figIdx}-${rowIdx}-${colIdx}`}
                          onMouseDown={() => handleFigureMouseDown(figIdx, rowIdx, colIdx)}
                          onMouseEnter={() => handleFigureMouseEnter(figIdx, rowIdx, colIdx)}
                          className={`w-8 h-8 border border-white cursor-pointer ${cell ? 'bg-blue-500' : 'bg-gray-200'}`}
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
              isCalculating ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isCalculating ? 'Calculating...' : 'Solve'}
          </button>
          <p className="mt-3 text-sm text-gray-600">
            Press <kbd className="px-2 py-1 bg-gray-200 rounded">Space</kbd> to solve
          </p>
        </div>

        {solutionStats && (
          <div className="bg-green-50 rounded-lg p-6 mb-8 border-2 border-green-300">
            <h2 className="text-2xl font-bold mb-4">Solution Found!</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded p-4">
                <p className="text-sm text-gray-600">Score</p>
                <p className="text-3xl font-bold text-green-600">{solutionStats.totalScore}</p>
              </div>
              <div className="bg-white rounded p-4">
                <p className="text-sm text-gray-600">Lines Cleared</p>
                <p className="text-3xl font-bold text-blue-600">{solutionStats.totalLinesCleared}</p>
              </div>
              <div className="bg-white rounded p-4">
                <p className="text-sm text-gray-600">Efficiency</p>
                <p className="text-3xl font-bold text-orange-600">
                  {solutionStats.avgLinesPerMove.toFixed(1)}
                </p>
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
                <div
                  className="inline-block border-4 border-gray-400 rounded-lg overflow-hidden"
                  style={{ lineHeight: 0 }}
                >
                  {move.gridAfterPlace.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex">
                      {row.map((cell, colIdx) => {
                        const wasPlaced = move.figure.some(
                          ([dr, dc]) => move.row + dr === rowIdx && move.col + dc === colIdx
                        );
                        const willBeCleared =
                          move.gridAfterPlace[rowIdx][colIdx] &&
                          (move.clearedRows.includes(rowIdx) || move.clearedCols.includes(colIdx));
                        return (
                          <div
                            key={`${rowIdx}-${colIdx}`}
                            className={`${cellSize} border-2 border-white relative ${
                              wasPlaced ? 'bg-blue-500' : cell ? 'bg-red-500' : 'bg-green-500'
                            }`}
                          >
                            {willBeCleared && (
                              <div className="absolute inset-1 bg-purple-400 rounded-full opacity-70" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-lg font-semibold">Lines cleared: {move.linesCleared}</p>
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
