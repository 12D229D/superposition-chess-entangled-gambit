/**
 * QuantumBoardState - Representación del estado cuántico del ajedrez en el espacio de Hilbert
 * Modela piezas en superposición coherente, amplitudes complejas, matrices de ocupación
 * y vínculos de entrelazamiento EPR (Bell pairs).
 */

export class Complex {
  constructor(real = 0, imag = 0) {
    this.real = real;
    this.imag = imag;
  }

  static fromPolar(r, theta) {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }

  add(other) {
    return new Complex(this.real + other.real, this.imag + other.imag);
  }

  sub(other) {
    return new Complex(this.real - other.real, this.imag - other.imag);
  }

  mul(other) {
    if (typeof other === 'number') {
      return new Complex(this.real * other, this.imag * other);
    }
    return new Complex(
      this.real * other.real - this.imag * other.imag,
      this.real * other.imag + this.imag * other.real
    );
  }

  magnitudeSquared() {
    return this.real * this.real + this.imag * this.imag;
  }

  magnitude() {
    return Math.sqrt(this.magnitudeSquared());
  }

  phase() {
    return Math.atan2(this.imag, this.real);
  }

  clone() {
    return new Complex(this.real, this.imag);
  }
}

let pieceCounter = 1;

export class QuantumPiece {
  constructor(id, type, color, square, amplitude = new Complex(1, 0)) {
    this.id = id || `qp_${color}_${type}_${pieceCounter++}`;
    this.type = type; // 'p', 'r', 'n', 'b', 'q', 'k'
    this.color = color; // 'w' | 'b'
    // Map of square -> Complex amplitude
    this.superposition = new Map();
    if (square) {
      this.superposition.set(square, amplitude);
    }
    // Entangled piece IDs and correlation type
    this.entangledWith = new Set();
    this.hasMoved = false;
  }

  isSuperposed() {
    return this.superposition.size > 1;
  }

  getSquares() {
    return Array.from(this.superposition.keys());
  }

  getProbability(square) {
    const amp = this.superposition.get(square);
    if (!amp) return 0;
    return amp.magnitudeSquared();
  }

  normalize() {
    let totalNormSq = 0;
    for (const amp of this.superposition.values()) {
      totalNormSq += amp.magnitudeSquared();
    }
    if (totalNormSq > 0 && Math.abs(totalNormSq - 1.0) > 1e-6) {
      const scale = 1.0 / Math.sqrt(totalNormSq);
      for (const [sq, amp] of this.superposition.entries()) {
        this.superposition.set(sq, amp.mul(scale));
      }
    }
  }

  clone() {
    const clone = new QuantumPiece(this.id, this.type, this.color);
    for (const [sq, amp] of this.superposition.entries()) {
      clone.superposition.set(sq, amp.clone());
    }
    clone.entangledWith = new Set(this.entangledWith);
    clone.hasMoved = this.hasMoved;
    return clone;
  }
}

export class QuantumBoard {
  constructor() {
    // Map of pieceId -> QuantumPiece
    this.pieces = new Map();
    // Cache map: square -> Set of pieceIds present
    this.squareOccupancy = new Map();
    this.history = [];
    this.entangledLinks = []; // Array of { idA, idB, sqA, sqB, type: 'BELL_PHI_PLUS' | 'CNOT' }
    this.resetStandardBoard();
  }

  resetStandardBoard() {
    this.pieces.clear();
    this.squareOccupancy.clear();
    this.entangledLinks = [];
    this.history = [];
    pieceCounter = 1;

    const initialSetup = [
      // Black pieces (row 7 and 8, 0-indexed: row 7 is rank 8, row 6 is rank 7)
      { sq: 'a8', type: 'r', color: 'b' },
      { sq: 'b8', type: 'n', color: 'b' },
      { sq: 'c8', type: 'b', color: 'b' },
      { sq: 'd8', type: 'q', color: 'b' },
      { sq: 'e8', type: 'k', color: 'b' },
      { sq: 'f8', type: 'b', color: 'b' },
      { sq: 'g8', type: 'n', color: 'b' },
      { sq: 'h8', type: 'r', color: 'b' },
      { sq: 'a7', type: 'p', color: 'b' },
      { sq: 'b7', type: 'p', color: 'b' },
      { sq: 'c7', type: 'p', color: 'b' },
      { sq: 'd7', type: 'p', color: 'b' },
      { sq: 'e7', type: 'p', color: 'b' },
      { sq: 'f7', type: 'p', color: 'b' },
      { sq: 'g7', type: 'p', color: 'b' },
      { sq: 'h7', type: 'p', color: 'b' },

      // White pieces
      { sq: 'a2', type: 'p', color: 'w' },
      { sq: 'b2', type: 'p', color: 'w' },
      { sq: 'c2', type: 'p', color: 'w' },
      { sq: 'd2', type: 'p', color: 'w' },
      { sq: 'e2', type: 'p', color: 'w' },
      { sq: 'f2', type: 'p', color: 'w' },
      { sq: 'g2', type: 'p', color: 'w' },
      { sq: 'h2', type: 'p', color: 'w' },
      { sq: 'a1', type: 'r', color: 'w' },
      { sq: 'b1', type: 'n', color: 'w' },
      { sq: 'c1', type: 'b', color: 'w' },
      { sq: 'd1', type: 'q', color: 'w' },
      { sq: 'e1', type: 'k', color: 'w' },
      { sq: 'f1', type: 'b', color: 'w' },
      { sq: 'g1', type: 'n', color: 'w' },
      { sq: 'h1', type: 'r', color: 'w' },
    ];

    for (const item of initialSetup) {
      const p = new QuantumPiece(`piece_${item.color}_${item.type}_${item.sq}`, item.type, item.color, item.sq);
      this.pieces.set(p.id, p);
    }
    this.recalculateOccupancy();
  }

  recalculateOccupancy() {
    this.squareOccupancy.clear();
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const sq = String.fromCharCode(97 + f) + (r + 1);
        this.squareOccupancy.set(sq, new Set());
      }
    }

    for (const piece of this.pieces.values()) {
      for (const sq of piece.getSquares()) {
        const set = this.squareOccupancy.get(sq);
        if (set) {
          set.add(piece.id);
        }
      }
    }
  }

  getPiece(pieceId) {
    return this.pieces.get(pieceId);
  }

  getPiecesAt(square) {
    const ids = this.squareOccupancy.get(square);
    if (!ids) return [];
    return Array.from(ids).map(id => this.pieces.get(id)).filter(Boolean);
  }

  /**
   * Movimiento clásico determinista
   */
  classicalMove(pieceId, fromSq, toSq) {
    const piece = this.pieces.get(pieceId);
    if (!piece) return false;

    // Si la pieza estaba en superposición en fromSq, movemos solo esa rama o todo si solo estaba allí
    if (piece.superposition.has(fromSq)) {
      const amp = piece.superposition.get(fromSq);
      piece.superposition.delete(fromSq);
      
      const existingToAmp = piece.superposition.get(toSq) || new Complex(0, 0);
      piece.superposition.set(toSq, existingToAmp.add(amp));
      piece.hasMoved = true;
      this.recalculateOccupancy();
      return true;
    }
    return false;
  }

  /**
   * Split Move Cuántico con compuerta Hadamard o sqrt(iSWAP)
   * Divide la presencia de la pieza entre targetSq1 y targetSq2.
   * Amplitud split: |alpha|^2 = 0.5, |beta|^2 = 0.5
   */
  splitMove(pieceId, fromSq, targetSq1, targetSq2, gateType = 'HADAMARD') {
    const piece = this.pieces.get(pieceId);
    if (!piece || !piece.superposition.has(fromSq)) return false;

    const currentAmp = piece.superposition.get(fromSq);
    piece.superposition.delete(fromSq);

    const invSqrt2 = 1.0 / Math.SQRT2;
    let amp1, amp2;

    if (gateType === 'HADAMARD') {
      // H: ( |0> + |1> ) / sqrt(2)
      amp1 = currentAmp.mul(invSqrt2);
      amp2 = currentAmp.mul(invSqrt2);
    } else {
      // sqrt(iSWAP): introduce factor de fase e^(i*pi/4) = (1 + i)/sqrt(2)
      amp1 = currentAmp.mul(invSqrt2);
      const phaseFactor = new Complex(invSqrt2, invSqrt2);
      amp2 = currentAmp.mul(invSqrt2).mul(phaseFactor);
    }

    const ex1 = piece.superposition.get(targetSq1) || new Complex(0, 0);
    const ex2 = piece.superposition.get(targetSq2) || new Complex(0, 0);

    piece.superposition.set(targetSq1, ex1.add(amp1));
    piece.superposition.set(targetSq2, ex2.add(amp2));
    piece.hasMoved = true;
    piece.normalize();

    this.recalculateOccupancy();
    return true;
  }

  /**
   * Merge Move con interferencia de fase
   * Dos ramas de la misma pieza o piezas correlacionadas se unen en un único escaque.
   */
  mergeMove(pieceId, fromSq1, fromSq2, targetSq) {
    const piece = this.pieces.get(pieceId);
    if (!piece) return false;

    const amp1 = piece.superposition.get(fromSq1) || new Complex(0, 0);
    const amp2 = piece.superposition.get(fromSq2) || new Complex(0, 0);

    piece.superposition.delete(fromSq1);
    piece.superposition.delete(fromSq2);

    // Interferencia cuántica: suma coherente de amplitudes complejas
    const mergedAmp = amp1.add(amp2);
    const existing = piece.superposition.get(targetSq) || new Complex(0, 0);
    piece.superposition.set(targetSq, existing.add(mergedAmp));
    piece.hasMoved = true;
    piece.normalize();

    this.recalculateOccupancy();
    return true;
  }

  /**
   * Entangle CNOT entre dos piezas
   * Condiciona la presencia de targetPiece a la presencia de controlPiece
   */
  entanglePieces(controlPieceId, targetPieceId, controlSq, targetSq, type = 'CNOT') {
    const p1 = this.pieces.get(controlPieceId);
    const p2 = this.pieces.get(targetPieceId);
    if (!p1 || !p2) return false;

    p1.entangledWith.add(p2.id);
    p2.entangledWith.add(p1.id);

    this.entangledLinks.push({
      idA: p1.id,
      idB: p2.id,
      sqA: controlSq,
      sqB: targetSq,
      type
    });

    return true;
  }

  removePiece(pieceId) {
    const piece = this.pieces.get(pieceId);
    if (!piece) return;

    // Romper entrelazamientos
    for (const entId of piece.entangledWith) {
      const entPiece = this.pieces.get(entId);
      if (entPiece) {
        entPiece.entangledWith.delete(pieceId);
      }
    }

    this.entangledLinks = this.entangledLinks.filter(l => l.idA !== pieceId && l.idB !== pieceId);
    this.pieces.delete(pieceId);
    this.recalculateOccupancy();
  }

  clone() {
    const newBoard = new QuantumBoard();
    newBoard.pieces.clear();
    for (const [id, piece] of this.pieces.entries()) {
      newBoard.pieces.set(id, piece.clone());
    }
    newBoard.entangledLinks = this.entangledLinks.map(l => ({ ...l }));
    newBoard.history = [...this.history];
    newBoard.recalculateOccupancy();
    return newBoard;
  }

  getEntropy() {
    // Entropía de von Neumann estimada para el tablero basada en superposición
    let entropy = 0;
    for (const piece of this.pieces.values()) {
      if (piece.isSuperposed()) {
        for (const [_, amp] of piece.superposition.entries()) {
          const p = amp.magnitudeSquared();
          if (p > 1e-6) {
            entropy -= p * Math.log2(p);
          }
        }
      }
    }
    return entropy;
  }
}
