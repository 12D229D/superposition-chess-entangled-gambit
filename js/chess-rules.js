/**
 * ChessRules - Validación de movimientos estándar de ajedrez y movimientos cuánticos
 */

export class ChessRules {
  static files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  static squareToCoords(square) {
    if (!square || square.length < 2) return null;
    const file = square.charCodeAt(0) - 97; // 0 to 7 (a-h)
    const rank = parseInt(square[1], 10) - 1; // 0 to 7 (1-8)
    return { file, rank };
  }

  static coordsToSquare(file, rank) {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return `${ChessRules.files[file]}${rank + 1}`;
  }

  static isInsideBoard(file, rank) {
    return file >= 0 && file <= 7 && rank >= 0 && rank <= 7;
  }

  /**
   * Obtiene todos los destinos legales para una pieza desde una casilla específica
   */
  static getStandardDestinations(piece, fromSquare, board) {
    const coords = this.squareToCoords(fromSquare);
    if (!coords) return [];
    const { file, rank } = coords;
    const destinations = [];
    const color = piece.color;
    const type = piece.type;

    // Helper para verificar casillas
    const checkRay = (dFile, dRank) => {
      let curF = file + dFile;
      let curR = rank + dRank;
      while (this.isInsideBoard(curF, curR)) {
        const sq = this.coordsToSquare(curF, curR);
        const pieces = board.getPiecesAt(sq);
        // Si hay pieza del mismo color determinista (P=1.0), se detiene
        const friendlyClassical = pieces.some(p => p.color === color && !p.isSuperposed());
        if (friendlyClassical) break;

        destinations.push(sq);

        // Si hay una pieza del oponente clásico o cualquier pieza clásica, se bloquea el rayo
        const opponentClassical = pieces.some(p => p.color !== color && !p.isSuperposed());
        if (opponentClassical) break;

        curF += dFile;
        curR += dRank;
      }
    };

    switch (type) {
      case 'p': { // Peón
        const dir = color === 'w' ? 1 : -1;
        const startRank = color === 'w' ? 1 : 6;

        // Avance simple
        const forwardR = rank + dir;
        if (this.isInsideBoard(file, forwardR)) {
          const sqFwd = this.coordsToSquare(file, forwardR);
          const pcs = board.getPiecesAt(sqFwd);
          if (!pcs.some(p => !p.isSuperposed())) {
            destinations.push(sqFwd);

            // Avance doble inicial
            const doubleR = rank + 2 * dir;
            if (rank === startRank && this.isInsideBoard(file, doubleR)) {
              const sqDbl = this.coordsToSquare(file, doubleR);
              const pcsDbl = board.getPiecesAt(sqDbl);
              if (!pcsDbl.some(p => !p.isSuperposed())) {
                destinations.push(sqDbl);
              }
            }
          }
        }

        // Capturas diagonales
        for (const df of [-1, 1]) {
          const capF = file + df;
          const capR = rank + dir;
          if (this.isInsideBoard(capF, capR)) {
            const sqCap = this.coordsToSquare(capF, capR);
            const pieces = board.getPiecesAt(sqCap);
            // Puede intentar capturar si hay piezas enemigas (o casillas cuánticas)
            if (pieces.length > 0 && pieces.some(p => p.color !== color)) {
              destinations.push(sqCap);
            }
          }
        }
        break;
      }

      case 'n': { // Caballo
        const knightOffsets = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [df, dr] of knightOffsets) {
          const curF = file + df;
          const curR = rank + dr;
          if (this.isInsideBoard(curF, curR)) {
            const sq = this.coordsToSquare(curF, curR);
            const pcs = board.getPiecesAt(sq);
            if (!pcs.some(p => p.color === color && !p.isSuperposed())) {
              destinations.push(sq);
            }
          }
        }
        break;
      }

      case 'b': { // Alfil
        checkRay(1, 1);
        checkRay(1, -1);
        checkRay(-1, 1);
        checkRay(-1, -1);
        break;
      }

      case 'r': { // Torre
        checkRay(1, 0);
        checkRay(-1, 0);
        checkRay(0, 1);
        checkRay(0, -1);
        break;
      }

      case 'q': { // Dama
        checkRay(1, 1);
        checkRay(1, -1);
        checkRay(-1, 1);
        checkRay(-1, -1);
        checkRay(1, 0);
        checkRay(-1, 0);
        checkRay(0, 1);
        checkRay(0, -1);
        break;
      }

      case 'k': { // Rey
        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0) continue;
            const curF = file + df;
            const curR = rank + dr;
            if (this.isInsideBoard(curF, curR)) {
              const sq = this.coordsToSquare(curF, curR);
              const pcs = board.getPiecesAt(sq);
              if (!pcs.some(p => p.color === color && !p.isSuperposed())) {
                destinations.push(sq);
              }
            }
          }
        }
        break;
      }
    }

    return destinations;
  }

  /**
   * Valida si un Split Move es legal:
   * Ambos destinos deben ser casillas legales según el movimiento de la pieza desde fromSquare.
   */
  static getValidSplitMoves(piece, fromSquare, board) {
    const validDests = this.getStandardDestinations(piece, fromSquare, board);
    if (validDests.length < 2) return [];

    const splitPairs = [];
    for (let i = 0; i < validDests.length; i++) {
      for (let j = i + 1; j < validDests.length; j++) {
        splitPairs.push([validDests[i], validDests[j]]);
      }
    }
    return splitPairs;
  }

  /**
   * Valida Merge Moves:
   * Si una pieza tiene presencia en 2 o más casillas, puede intentar converger en un destino común
   * accesible desde ambas casillas.
   */
  static getValidMergeMoves(piece, board) {
    const squares = piece.getSquares();
    if (squares.length < 2) return [];

    const mergeOptions = [];
    for (let i = 0; i < squares.length; i++) {
      for (let j = i + 1; j < squares.length; j++) {
        const sqA = squares[i];
        const sqB = squares[j];

        const destsA = new Set(this.getStandardDestinations(piece, sqA, board));
        const destsB = new Set(this.getStandardDestinations(piece, sqB, board));

        // Intersección de destinos comunes
        const commonDests = [...destsA].filter(x => destsB.has(x));
        for (const target of commonDests) {
          mergeOptions.push({ sqA, sqB, target });
        }
      }
    }
    return mergeOptions;
  }

  /**
   * Obtiene posibles piezas para entrelazar con CNOT
   */
  static getValidEntangleMoves(piece, fromSquare, board) {
    const destinations = this.getStandardDestinations(piece, fromSquare, board);
    const options = [];

    for (const sq of destinations) {
      const targetPieces = board.getPiecesAt(sq);
      for (const tp of targetPieces) {
        if (tp.id !== piece.id) {
          options.push({ targetPiece: tp, targetSquare: sq });
        }
      }
    }
    return options;
  }
}
