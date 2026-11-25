/**
 * QuantumAI - IA Cuántica con Evaluación Heurística Expectiminimax
 * Pondera la utilidad de las piezas clásicas más el valor esperado de las piezas en superposición
 * E[V] = sum( P(x, y) * PieceValue(x, y) ) y bonificaciones de entrelazamiento.
 */

import { ChessRules } from './chess-rules.js';

export class QuantumAI {
  static PIECE_VALUES = {
    'p': 100,
    'n': 320,
    'b': 330,
    'r': 500,
    'q': 900,
    'k': 20000
  };

  /**
   * Evalúa la función de valor para una posición dada
   */
  static evaluateBoard(board, perspectiveColor = 'b') {
    let score = 0;

    for (const piece of board.pieces.values()) {
      const baseVal = this.PIECE_VALUES[piece.type] || 0;
      const isFriend = piece.color === perspectiveColor;
      const sign = isFriend ? 1 : -1;

      // Calcular valor esperado: E[V] = sum( P(sq) * baseVal )
      let expectedPresence = 0;
      for (const [sq, _] of piece.superposition.entries()) {
        const prob = piece.getProbability(sq);
        // Bonificación por control central (d4, e4, d5, e5)
        const coords = ChessRules.squareToCoords(sq);
        let centerBonus = 0;
        if (coords) {
          const distToCenter = Math.abs(coords.file - 3.5) + Math.abs(coords.rank - 3.5);
          centerBonus = (7 - distToCenter) * 4;
        }
        expectedPresence += prob * (baseVal + centerBonus);
      }

      // Bonificación por superposición estratégica (más movilidad e incertidumbre para el rival)
      if (piece.isSuperposed()) {
        expectedPresence += (isFriend ? 25 : -15);
      }

      // Bonificación por entrelazamiento cuántico activo
      if (piece.entangledWith.size > 0) {
        expectedPresence += (isFriend ? 35 : -20);
      }

      score += sign * expectedPresence;
    }

    return score;
  }

  /**
   * Genera todos los movimientos legales posibles para un bando (clásicos, splits y merges)
   */
  static getAllLegalMoves(board, color) {
    const moves = [];

    for (const piece of board.pieces.values()) {
      if (piece.color !== color) continue;

      const currentSquares = piece.getSquares();

      // 1. Movimientos clásicos desde cada rama
      for (const sq of currentSquares) {
        const dests = ChessRules.getStandardDestinations(piece, sq, board);
        for (const dest of dests) {
          moves.push({
            type: 'CLASSICAL',
            pieceId: piece.id,
            from: sq,
            to: dest,
            pieceType: piece.type
          });
        }

        // 2. Split Moves (Hadamard o sqrt(iSWAP))
        if (!piece.isSuperposed()) {
          const splitPairs = ChessRules.getValidSplitMoves(piece, sq, board);
          // Limitar muestras para mantener rendimiento fluido
          for (let i = 0; i < Math.min(splitPairs.length, 6); i++) {
            moves.push({
              type: 'SPLIT',
              pieceId: piece.id,
              from: sq,
              to1: splitPairs[i][0],
              to2: splitPairs[i][1],
              gate: i % 2 === 0 ? 'HADAMARD' : 'SQRT_ISWAP',
              pieceType: piece.type
            });
          }
        }
      }

      // 3. Merge Moves si la pieza tiene superposición
      if (piece.isSuperposed()) {
        const mergeOptions = ChessRules.getValidMergeMoves(piece, board);
        for (const m of mergeOptions) {
          moves.push({
            type: 'MERGE',
            pieceId: piece.id,
            from1: m.sqA,
            from2: m.sqB,
            target: m.target,
            pieceType: piece.type
          });
        }
      }
    }

    return moves;
  }

  /**
   * Encuentra el mejor movimiento para la IA cuántica
   */
  static getBestMove(board, color = 'b', depth = 2) {
    const legalMoves = this.getAllLegalMoves(board, color);
    if (legalMoves.length === 0) return null;

    let bestScore = -Infinity;
    let bestMove = legalMoves[0];

    // Ordenar heurísticamente: priorizar capturas y splits interesantes
    legalMoves.sort((a, b) => {
      let scoreA = a.type === 'SPLIT' ? 20 : 0;
      let scoreB = b.type === 'SPLIT' ? 20 : 0;
      return scoreB - scoreA;
    });

    for (const move of legalMoves) {
      // Simular movimiento sobre un clon del tablero
      const clonedBoard = board.clone();
      this.applyMoveToBoard(clonedBoard, move);

      // Evaluación simple en profundidad reducida
      const evalScore = this.evaluateBoard(clonedBoard, color);

      if (evalScore > bestScore) {
        bestScore = evalScore;
        bestMove = move;
      }
    }

    return {
      move: bestMove,
      evalScore: bestScore
    };
  }

  static applyMoveToBoard(board, move) {
    if (move.type === 'CLASSICAL') {
      board.classicalMove(move.pieceId, move.from, move.to);
    } else if (move.type === 'SPLIT') {
      board.splitMove(move.pieceId, move.from, move.to1, move.to2, move.gate);
    } else if (move.type === 'MERGE') {
      board.mergeMove(move.pieceId, move.from1, move.from2, move.target);
    }
  }
}
