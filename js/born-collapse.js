/**
 * BornCollapseEngine - Motor de Medición Proyectiva según la Regla de Born
 * 
 * P(k) = |<k|psi>|^2
 * Resuelve la medición cuántica de una casilla o conflicto de ocupación:
 * 1. Calcula las probabilidades de existencia de cada pieza candidata.
 * 2. Muestrea el resultado (colapso probabilístico o determinista).
 * 3. Proyecta el estado: colapsa la rama elegida a probabilidad 1.0 (o elimina la pieza si no sobrevivió).
 * 4. Resuelve en cascada las piezas correlacionadas mediante entrelazamiento Bell o CNOT.
 */

import { Complex } from './quantum-board.js';

export class BornCollapseEngine {
  /**
   * Mide una casilla específica con conflicto cuántico o intento de captura.
   * Devuelve un objeto detallado del resultado de la medición.
   */
  static measureSquare(board, targetSquare) {
    const pieces = board.getPiecesAt(targetSquare);
    if (pieces.length === 0) {
      return {
        measuredSquare: targetSquare,
        collapsedPieceId: null,
        survived: false,
        outcome: 'EMPTY',
        probabilities: [],
        cascades: []
      };
    }

    // Calcular las probabilidades de cada pieza en targetSquare
    const probabilities = pieces.map(p => {
      const prob = p.getProbability(targetSquare);
      return {
        pieceId: p.id,
        color: p.color,
        type: p.type,
        prob
      };
    });

    // Muestreo estocástico proyectivo según Born:
    const randomVal = Math.random();
    let cumulative = 0;
    let selectedPiece = null;

    for (const item of probabilities) {
      cumulative += item.prob;
      if (randomVal <= cumulative) {
        selectedPiece = board.getPiece(item.pieceId);
        break;
      }
    }

    // Si randomVal superó la suma de probabilidades (posibilidad de escaque vacío en caso de amplitudes parciales)
    const emptyProb = Math.max(0, 1.0 - cumulative);
    if (!selectedPiece && randomVal > cumulative && emptyProb > 0.05) {
      // El escaque colapsa a vacío: todas las piezas presentes en targetSquare pierden esa rama
      const cascades = [];
      for (const item of probabilities) {
        const p = board.getPiece(item.pieceId);
        if (p) {
          p.superposition.delete(targetSquare);
          p.normalize();
          // Cascada de entrelazamiento
          const cascadeResults = this.resolveEntanglementCascade(board, p.id, targetSquare, false);
          cascades.push(...cascadeResults);
        }
      }
      board.recalculateOccupancy();
      return {
        measuredSquare: targetSquare,
        collapsedPieceId: null,
        survived: false,
        outcome: 'VACUUM_COLLAPSE',
        probabilities,
        cascades
      };
    }

    if (!selectedPiece) {
      selectedPiece = board.getPiece(probabilities[0].pieceId);
    }

    // La pieza seleccionada materializa su presencia al 100% en targetSquare
    // Todas sus otras ramas en superposición colapsan a 0
    const abandonedSquares = selectedPiece.getSquares().filter(sq => sq !== targetSquare);
    selectedPiece.superposition.clear();
    selectedPiece.superposition.set(targetSquare, new Complex(1, 0));

    // Las demás piezas en targetSquare NO sobreviven en esta casilla
    const cascades = [];
    for (const item of probabilities) {
      if (item.pieceId !== selectedPiece.id) {
        const loserPiece = board.getPiece(item.pieceId);
        if (loserPiece) {
          loserPiece.superposition.delete(targetSquare);
          loserPiece.normalize();

          // Si ya no tiene ramas en ninguna parte, la pieza deja de existir
          if (loserPiece.superposition.size === 0) {
            board.removePiece(loserPiece.id);
            cascades.push({
              pieceId: loserPiece.id,
              event: 'PIECE_ANNIHILATED',
              reason: 'Zero probability branches remaining'
            });
          } else {
            const cascadeResults = this.resolveEntanglementCascade(board, loserPiece.id, targetSquare, false);
            cascades.push(...cascadeResults);
          }
        }
      }
    }

    // Resolver cascada para la pieza ganadora
    const winnerCascade = this.resolveEntanglementCascade(board, selectedPiece.id, targetSquare, true);
    cascades.push(...winnerCascade);

    board.recalculateOccupancy();

    return {
      measuredSquare: targetSquare,
      collapsedPieceId: selectedPiece.id,
      survived: true,
      outcome: 'PIECE_MATERIALIZED',
      winnerPiece: {
        id: selectedPiece.id,
        color: selectedPiece.color,
        type: selectedPiece.type
      },
      abandonedSquares,
      probabilities,
      cascades
    };
  }

  /**
   * Resuelve la cascada de mediciones proyectivas sobre piezas entrelazadas (Bell Correlation / CNOT)
   */
  static resolveEntanglementCascade(board, sourcePieceId, measuredSquare, sourceObservedPresent) {
    const cascadeEvents = [];
    const linksToProcess = board.entangledLinks.filter(l => l.idA === sourcePieceId || l.idB === sourcePieceId);

    for (const link of linksToProcess) {
      const isA = link.idA === sourcePieceId;
      const partnerId = isA ? link.idB : link.idA;
      const partnerPiece = board.getPiece(partnerId);
      if (!partnerPiece) continue;

      if (link.type === 'CNOT') {
        // En CNOT, si el control (A) colapsa a |1> (presente), el target (B) invierte o fija su estado
        if (isA) {
          if (sourceObservedPresent) {
            // Se activa target
            cascadeEvents.push({
              pieceId: partnerId,
              event: 'CNOT_TRIGGERED',
              message: `Target ${partnerPiece.type.toUpperCase()} activado por medición de control.`
            });
          } else {
            // Control ausente: target conserva rama complementaria
            cascadeEvents.push({
              pieceId: partnerId,
              event: 'CNOT_BYPASS',
              message: `Target ${partnerPiece.type.toUpperCase()} mantuvo rama independiente.`
            });
          }
        }
      } else {
        // Bell pair (anti-correlación o correlación idéntica)
        if (sourceObservedPresent) {
          cascadeEvents.push({
            pieceId: partnerId,
            event: 'BELL_COLLAPSE_INDUCED',
            message: `Colapso instantáneo no-local en ${partnerPiece.type.toUpperCase()}.`
          });
        }
      }
    }

    // Limpiar enlaces ya resueltos
    board.entangledLinks = board.entangledLinks.filter(l => l.idA !== sourcePieceId && l.idB !== sourcePieceId);

    return cascadeEvents;
  }
}
