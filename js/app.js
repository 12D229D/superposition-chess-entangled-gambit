/**
 * Superposition Chess: Entangled Gambit - Main UI Controller & Engine Loop
 */

import { QuantumBoard, Complex } from './quantum-board.js';
import { ChessRules } from './chess-rules.js';
import { BornCollapseEngine } from './born-collapse.js';
import { QuantumAI } from './quantum-ai.js';
import { QASMExporter } from './qasm-exporter.js';

class QuantumChessApp {
  constructor() {
    this.board = new QuantumBoard();
    this.currentTurn = 'w'; // 'w' | 'b'
    this.selectedSquare = null;
    this.selectedPiece = null;
    this.currentMode = 'CLASSICAL'; // 'CLASSICAL' | 'SPLIT' | 'MERGE' | 'ENTANGLE'
    this.splitTarget1 = null;
    this.mergeSource1 = null;
    this.mergeSource2 = null;

    this.aiEnabled = true;
    this.aiColor = 'b';
    this.isAiThinking = false;
    this.audioEnabled = true;

    // Canvas & SVG Elements
    this.canvas = document.getElementById('chess-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.svgOverlay = document.getElementById('entanglement-overlay');

    // UI Elements
    this.statusDot = document.getElementById('status-dot');
    this.turnText = document.getElementById('turn-text');
    this.instructionsEl = document.getElementById('action-instructions');
    this.meterFill = document.getElementById('meter-fill');
    this.meterProbText = document.getElementById('meter-prob-text');
    this.collapseLog = document.getElementById('collapse-log');
    this.qasmCodeEl = document.getElementById('qasm-code');
    this.historyList = document.getElementById('history-list');

    // Initialize Web Audio
    this.initAudio();

    // Event Bindings
    this.bindEvents();
    this.render();
    this.updateQASM();
  }

  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  playQuantumTone(freq = 440, type = 'sine', duration = 0.3) {
    if (!this.audioEnabled || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      // Micro sweep for quantum feel
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.audioCtx.currentTime + duration);

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // Audio error ignored
    }
  }

  playCollapseThunder() {
    if (!this.audioEnabled || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.audioCtx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.6);
    } catch (e) {}
  }

  bindEvents() {
    // Canvas click
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

    // Mode buttons
    document.querySelectorAll('.btn-quantum-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = btn.dataset.mode;
        this.setMode(mode);
      });
    });

    // Reset button
    document.getElementById('btn-reset-board').addEventListener('click', () => {
      this.board.resetStandardBoard();
      this.currentTurn = 'w';
      this.selectedSquare = null;
      this.selectedPiece = null;
      this.splitTarget1 = null;
      this.mergeSource1 = null;
      this.mergeSource2 = null;
      this.collapseLog.innerHTML = '<div>> Tablero reiniciado al estado cuántico fundamental |0...0></div>';
      this.historyList.innerHTML = '';
      this.render();
      this.updateQASM();
      this.updateTurnIndicator();
      this.setInstructions('Partida reiniciada. Turno de las Blancas.');
    });

    // AI Toggle
    const aiToggle = document.getElementById('btn-toggle-ai');
    aiToggle.addEventListener('click', () => {
      this.aiEnabled = !this.aiEnabled;
      aiToggle.innerText = `Oponente IA: ${this.aiEnabled ? 'ACTIVADO' : 'DESACTIVADO'}`;
      aiToggle.style.borderColor = this.aiEnabled ? 'var(--quantum-cyan)' : 'var(--border-color)';
    });

    // Audio Toggle
    const audioToggle = document.getElementById('btn-toggle-audio');
    audioToggle.addEventListener('click', () => {
      this.audioEnabled = !this.audioEnabled;
      audioToggle.innerText = `Audio Sintético: ${this.audioEnabled ? 'ON' : 'OFF'}`;
    });

    // QASM Tabs
    const btnQasm = document.getElementById('btn-view-qasm');
    const btnCirq = document.getElementById('btn-view-cirq');
    btnQasm.addEventListener('click', () => {
      btnQasm.classList.add('active');
      btnCirq.classList.remove('active');
      this.showQasmFormat = 'QASM';
      this.updateQASM();
    });
    btnCirq.addEventListener('click', () => {
      btnCirq.classList.add('active');
      btnQasm.classList.remove('active');
      this.showQasmFormat = 'CIRQ';
      this.updateQASM();
    });

    // Rules Modal
    const rulesModal = document.getElementById('rules-modal');
    document.getElementById('btn-open-rules').addEventListener('click', () => {
      rulesModal.classList.add('open');
    });
    document.getElementById('btn-close-rules').addEventListener('click', () => {
      rulesModal.classList.remove('open');
    });
  }

  setMode(mode) {
    this.currentMode = mode;
    this.splitTarget1 = null;
    this.mergeSource1 = null;
    this.mergeSource2 = null;

    document.querySelectorAll('.btn-quantum-action').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    switch (mode) {
      case 'CLASSICAL':
        this.setInstructions('Modo Clásico: Selecciona tu pieza y luego la casilla de destino.');
        break;
      case 'SPLIT':
        this.setInstructions('Modo Split (Hadamard): Selecciona una pieza para dividirla en dos casillas.');
        break;
      case 'MERGE':
        this.setInstructions('Modo Merge: Selecciona las 2 ramas de tu pieza en superposición y luego el destino común.');
        break;
      case 'ENTANGLE':
        this.setInstructions('Modo Entangle CNOT: Selecciona una pieza de control y luego la pieza objetivo.');
        break;
    }
    this.render();
  }

  setInstructions(text) {
    if (this.instructionsEl) {
      this.instructionsEl.innerText = text;
    }
  }

  handleCanvasClick(e) {
    if (this.isAiThinking) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const file = Math.floor(x / (this.canvas.width / 8));
    const rank = 7 - Math.floor(y / (this.canvas.height / 8));
    const clickedSquare = ChessRules.coordsToSquare(file, rank);

    if (!clickedSquare) return;

    const piecesOnSquare = this.board.getPiecesAt(clickedSquare);
    const friendlyPiece = piecesOnSquare.find(p => p.color === this.currentTurn);

    if (this.currentMode === 'CLASSICAL') {
      this.handleClassicalClick(clickedSquare, friendlyPiece);
    } else if (this.currentMode === 'SPLIT') {
      this.handleSplitClick(clickedSquare, friendlyPiece);
    } else if (this.currentMode === 'MERGE') {
      this.handleMergeClick(clickedSquare, friendlyPiece);
    } else if (this.currentMode === 'ENTANGLE') {
      this.handleEntangleClick(clickedSquare, friendlyPiece);
    }

    this.render();
  }

  handleClassicalClick(clickedSquare, friendlyPiece) {
    if (!this.selectedSquare) {
      // Primer clic: seleccionar pieza del turno
      if (friendlyPiece) {
        this.selectedSquare = clickedSquare;
        this.selectedPiece = friendlyPiece;
        this.playQuantumTone(520, 'sine', 0.15);
        this.setInstructions(`Pieza seleccionada en ${clickedSquare}. Elige casilla de destino.`);
      }
    } else {
      // Segundo clic: destino
      if (clickedSquare === this.selectedSquare) {
        this.selectedSquare = null;
        this.selectedPiece = null;
        this.setInstructions('Selección deseleccionada.');
        return;
      }

      const validDests = ChessRules.getStandardDestinations(this.selectedPiece, this.selectedSquare, this.board);
      if (validDests.includes(clickedSquare)) {
        this.executeClassicalMove(this.selectedPiece, this.selectedSquare, clickedSquare);
      } else {
        // Clic en otra pieza aliada
        if (friendlyPiece) {
          this.selectedSquare = clickedSquare;
          this.selectedPiece = friendlyPiece;
          this.playQuantumTone(520, 'sine', 0.15);
        } else {
          this.setInstructions('Movimiento inválido para esta pieza.');
        }
      }
    }
  }

  executeClassicalMove(piece, fromSq, toSq) {
    // Verificar si en toSq hay piezas en superposición (requiere colapso de Born antes de mover/capturar)
    const targetPieces = this.board.getPiecesAt(toSq);
    const hasSuperpositionConflict = targetPieces.some(p => p.isSuperposed());

    if (hasSuperpositionConflict) {
      this.triggerBornCollapse(toSq, () => {
        this.board.classicalMove(piece.id, fromSq, toSq);
        this.finishTurn({
          type: 'CLASSICAL',
          piece: piece.type,
          from: fromSq,
          to: toSq
        });
      });
      return;
    }

    // Si hay una pieza enemiga determinista clásica, captura
    const enemyClassical = targetPieces.find(p => p.color !== piece.color && !p.isSuperposed());
    if (enemyClassical) {
      this.board.removePiece(enemyClassical.id);
      this.logEvent(`Captura clásica de ${enemyClassical.type.toUpperCase()} en ${toSq}`);
    }

    this.board.classicalMove(piece.id, fromSq, toSq);
    this.playQuantumTone(440, 'triangle', 0.2);
    this.finishTurn({
      type: 'CLASSICAL',
      piece: piece.type,
      from: fromSq,
      to: toSq
    });
  }

  handleSplitClick(clickedSquare, friendlyPiece) {
    if (!this.selectedPiece) {
      if (friendlyPiece) {
        if (friendlyPiece.isSuperposed()) {
          this.setInstructions('Esta pieza ya está en superposición.');
          return;
        }
        this.selectedPiece = friendlyPiece;
        this.selectedSquare = clickedSquare;
        this.setInstructions(`Dividir ${friendlyPiece.type.toUpperCase()}: Elige el primer destino cuántico.`);
        this.playQuantumTone(600, 'sine', 0.15);
      }
    } else if (!this.splitTarget1) {
      const validDests = ChessRules.getStandardDestinations(this.selectedPiece, this.selectedSquare, this.board);
      if (validDests.includes(clickedSquare) && clickedSquare !== this.selectedSquare) {
        this.splitTarget1 = clickedSquare;
        this.setInstructions(`Primer destino: ${clickedSquare}. Ahora elige el segundo destino.`);
        this.playQuantumTone(700, 'sine', 0.15);
      } else {
        this.setInstructions('Destino 1 no es válido para esta pieza.');
      }
    } else {
      const validDests = ChessRules.getStandardDestinations(this.selectedPiece, this.selectedSquare, this.board);
      if (validDests.includes(clickedSquare) && clickedSquare !== this.splitTarget1 && clickedSquare !== this.selectedSquare) {
        // Ejecutar Split Move con compuerta Hadamard
        this.board.splitMove(this.selectedPiece.id, this.selectedSquare, this.splitTarget1, clickedSquare, 'HADAMARD');
        this.playQuantumTone(880, 'sine', 0.4);
        this.logEvent(`Split Hadamard: ${this.selectedPiece.type.toUpperCase()} dividido entre ${this.splitTarget1} (|alpha|^2=0.5) y ${clickedSquare} (|beta|^2=0.5)`);
        
        const moveData = {
          type: 'SPLIT',
          gate: 'HADAMARD',
          piece: this.selectedPiece.type,
          from: this.selectedSquare,
          to1: this.splitTarget1,
          to2: clickedSquare
        };
        this.splitTarget1 = null;
        this.selectedPiece = null;
        this.selectedSquare = null;
        this.finishTurn(moveData);
      } else {
        this.setInstructions('Destino 2 inválido o idéntico al primero.');
      }
    }
  }

  handleMergeClick(clickedSquare, friendlyPiece) {
    if (!this.selectedPiece) {
      if (friendlyPiece && friendlyPiece.isSuperposed()) {
        this.selectedPiece = friendlyPiece;
        this.mergeSource1 = clickedSquare;
        this.setInstructions(`Merge: Primera rama en ${clickedSquare}. Selecciona la segunda rama.`);
        this.playQuantumTone(600, 'sine', 0.15);
      } else {
        this.setInstructions('Selecciona una pieza que esté en superposición.');
      }
    } else if (!this.mergeSource2) {
      if (this.selectedPiece.superposition.has(clickedSquare) && clickedSquare !== this.mergeSource1) {
        this.mergeSource2 = clickedSquare;
        this.setInstructions(`Ramas seleccionadas: ${this.mergeSource1} y ${clickedSquare}. Elige casilla de fusión común.`);
        this.playQuantumTone(700, 'sine', 0.15);
      }
    } else {
      // Destino de merge
      const mergeOptions = ChessRules.getValidMergeMoves(this.selectedPiece, this.board);
      const isValid = mergeOptions.some(m => 
        (m.sqA === this.mergeSource1 && m.sqB === this.mergeSource2 && m.target === clickedSquare) ||
        (m.sqB === this.mergeSource1 && m.sqA === this.mergeSource2 && m.target === clickedSquare)
      );

      if (isValid) {
        this.board.mergeMove(this.selectedPiece.id, this.mergeSource1, this.mergeSource2, clickedSquare);
        this.playQuantumTone(920, 'sine', 0.45);
        this.logEvent(`Merge Move con interferencia: ${this.selectedPiece.type.toUpperCase()} unificado en ${clickedSquare}`);
        
        const moveData = {
          type: 'MERGE',
          piece: this.selectedPiece.type,
          from1: this.mergeSource1,
          from2: this.mergeSource2,
          target: clickedSquare
        };
        this.mergeSource1 = null;
        this.mergeSource2 = null;
        this.selectedPiece = null;
        this.finishTurn(moveData);
      } else {
        this.setInstructions('Casilla de fusión inválida para ambas ramas.');
      }
    }
  }

  handleEntangleClick(clickedSquare, friendlyPiece) {
    if (!this.selectedPiece) {
      if (friendlyPiece) {
        this.selectedPiece = friendlyPiece;
        this.selectedSquare = clickedSquare;
        this.setInstructions(`Control CNOT: ${friendlyPiece.type.toUpperCase()} en ${clickedSquare}. Selecciona la pieza objetivo.`);
        this.playQuantumTone(550, 'sine', 0.15);
      }
    } else {
      const targetPieces = this.board.getPiecesAt(clickedSquare);
      const targetPiece = targetPieces[0];
      if (targetPiece && targetPiece.id !== this.selectedPiece.id) {
        this.board.entanglePieces(this.selectedPiece.id, targetPiece.id, this.selectedSquare, clickedSquare, 'CNOT');
        this.playQuantumTone(750, 'square', 0.35);
        this.logEvent(`Vínculo de Entrelazamiento CNOT creado: ${this.selectedPiece.type.toUpperCase()}(${this.selectedSquare}) <-> ${targetPiece.type.toUpperCase()}(${clickedSquare})`);

        const moveData = {
          type: 'ENTANGLE',
          control: this.selectedPiece.id,
          target: targetPiece.id,
          from: this.selectedSquare,
          to: clickedSquare
        };
        this.selectedPiece = null;
        this.selectedSquare = null;
        this.finishTurn(moveData);
      } else {
        this.setInstructions('Selecciona una pieza objetivo válida para entrelazar.');
      }
    }
  }

  triggerBornCollapse(square, onComplete) {
    this.playCollapseThunder();
    this.flashLightning();

    const collapseResult = BornCollapseEngine.measureSquare(this.board, square);

    // Actualizar medidor Born
    if (collapseResult.winnerPiece) {
      this.meterFill.style.width = '100%';
      this.meterProbText.innerText = `P(|1>) = 1.00 (Colapsó en ${square})`;
    } else {
      this.meterFill.style.width = '0%';
      this.meterProbText.innerText = `P(|0>) = 1.00 (Escaque Vacío)`;
    }

    // Registrar en el log
    this.logEvent(`[BORN COLLAPSE] Medición en ${square} -> ${collapseResult.outcome}`);
    for (const cascade of collapseResult.cascades) {
      this.logEvent(`[CASCADE] ${cascade.event}: ${cascade.message || cascade.reason || ''}`);
    }

    this.board.history.push({
      type: 'COLLAPSE',
      square,
      outcome: collapseResult.outcome
    });

    setTimeout(() => {
      if (onComplete) onComplete();
      this.render();
      this.updateQASM();
    }, 600);
  }

  flashLightning() {
    this.canvas.classList.add('lightning-active');
    setTimeout(() => {
      this.canvas.classList.remove('lightning-active');
    }, 550);
  }

  logEvent(text) {
    const div = document.createElement('div');
    div.innerText = `> ${text}`;
    this.collapseLog.prepend(div);
  }

  finishTurn(moveData) {
    this.board.history.push(moveData);
    this.addHistoryItem(moveData);
    this.selectedSquare = null;
    this.selectedPiece = null;
    this.splitTarget1 = null;
    this.mergeSource1 = null;
    this.mergeSource2 = null;

    // Cambiar turno
    this.currentTurn = this.currentTurn === 'w' ? 'b' : 'w';
    this.updateTurnIndicator();
    this.updateQASM();

    // Reset modo a clásico por defecto
    this.setMode('CLASSICAL');

    if (this.aiEnabled && this.currentTurn === this.aiColor) {
      this.triggerAIMove();
    }
  }

  triggerAIMove() {
    this.isAiThinking = true;
    this.statusDot.classList.add('ai-thinking');
    this.setInstructions('IA Cuántica calculando en espacio de Hilbert (Expectiminimax)...');

    setTimeout(() => {
      const aiDecision = QuantumAI.getBestMove(this.board, this.aiColor, 2);
      this.isAiThinking = false;
      this.statusDot.classList.remove('ai-thinking');

      if (!aiDecision || !aiDecision.move) {
        this.setInstructions('La IA no tiene movimientos válidos.');
        return;
      }

      const move = aiDecision.move;
      if (move.type === 'CLASSICAL') {
        const piece = this.board.getPiece(move.pieceId);
        if (piece) {
          const targetPieces = this.board.getPiecesAt(move.to);
          if (targetPieces.some(p => p.isSuperposed())) {
            this.triggerBornCollapse(move.to, () => {
              this.board.classicalMove(piece.id, move.from, move.to);
              this.finishTurn(move);
            });
            return;
          }
          this.board.classicalMove(piece.id, move.from, move.to);
        }
      } else if (move.type === 'SPLIT') {
        this.board.splitMove(move.pieceId, move.from, move.to1, move.to2, move.gate);
        this.playQuantumTone(600, 'sine', 0.3);
      } else if (move.type === 'MERGE') {
        this.board.mergeMove(move.pieceId, move.from1, move.from2, move.target);
        this.playQuantumTone(700, 'sine', 0.3);
      }

      this.finishTurn(move);
      this.render();
    }, 700);
  }

  updateTurnIndicator() {
    const isWhite = this.currentTurn === 'w';
    this.turnText.innerText = isWhite ? 'Turno: Blancas' : 'Turno: Negras (IA)';
    this.statusDot.style.background = isWhite ? 'var(--quantum-cyan)' : 'var(--quantum-magenta)';
    this.statusDot.style.boxShadow = isWhite ? '0 0 8px var(--quantum-cyan)' : '0 0 8px var(--quantum-magenta)';
  }

  addHistoryItem(move) {
    const item = document.createElement('div');
    item.className = 'history-item';
    if (move.type === 'SPLIT') item.classList.add('split-move');
    if (move.type === 'MERGE' || move.type === 'ENTANGLE') item.classList.add('quantum-move');

    const num = this.board.history.length;
    let desc = '';
    if (move.type === 'CLASSICAL') desc = `${move.piece?.toUpperCase() || ''} ${move.from} → ${move.to}`;
    if (move.type === 'SPLIT') desc = `H-Split ${move.piece?.toUpperCase() || ''}: ${move.from} → ${move.to1} | ${move.to2}`;
    if (move.type === 'MERGE') desc = `Merge ${move.piece?.toUpperCase() || ''}: ${move.from1} & ${move.from2} → ${move.target}`;
    if (move.type === 'ENTANGLE') desc = `CNOT Bell Link (${move.from} ⇄ ${move.to})`;

    item.innerHTML = `<span>#${num} ${desc}</span>`;
    this.historyList.prepend(item);
  }

  updateQASM() {
    if (!this.qasmCodeEl) return;
    if (this.showQasmFormat === 'CIRQ') {
      this.qasmCodeEl.textContent = QASMExporter.toCirqPython(this.board.history, this.board);
    } else {
      this.qasmCodeEl.textContent = QASMExporter.toOpenQASM(this.board.history, this.board);
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const sqSize = w / 8;

    ctx.clearRect(0, 0, w, h);

    // 1. Dibujar casillas
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const isLight = (f + r) % 2 !== 0;
        const x = f * sqSize;
        const y = (7 - r) * sqSize;

        ctx.fillStyle = isLight ? '#2a354b' : '#141b2a';
        ctx.fillRect(x, y, sqSize, sqSize);

        // Highlight selected
        const sqName = ChessRules.coordsToSquare(f, r);
        if (sqName === this.selectedSquare) {
          ctx.fillStyle = 'rgba(230, 50, 200, 0.4)';
          ctx.fillRect(x, y, sqSize, sqSize);
        }
        if (sqName === this.splitTarget1 || sqName === this.mergeSource1 || sqName === this.mergeSource2) {
          ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
          ctx.fillRect(x, y, sqSize, sqSize);
        }

        // Notación de bordes
        if (f === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.font = '10px Inter';
          ctx.fillText(`${r + 1}`, x + 4, y + 14);
        }
        if (r === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.font = '10px Inter';
          ctx.fillText(ChessRules.files[f], x + sqSize - 12, y + sqSize - 4);
        }
      }
    }

    // 2. Dibujar piezas y halos cuánticos
    for (const piece of this.board.pieces.values()) {
      for (const [sq, amp] of piece.superposition.entries()) {
        const coords = ChessRules.squareToCoords(sq);
        if (!coords) continue;

        const x = coords.file * sqSize;
        const y = (7 - coords.rank) * sqSize;
        const prob = amp.magnitudeSquared();

        // Si está en superposición, halo translúcido y aro de probabilidad
        if (piece.isSuperposed()) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x + sqSize / 2, y + sqSize / 2, sqSize * 0.42, 0, Math.PI * 2);
          ctx.fillStyle = piece.color === 'w' ? `rgba(0, 240, 255, ${0.15 * prob})` : `rgba(240, 40, 220, ${0.15 * prob})`;
          ctx.fill();

          // Arco de probabilidad
          ctx.beginPath();
          ctx.lineWidth = 3;
          ctx.strokeStyle = piece.color === 'w' ? '#00f0ff' : '#f028dc';
          ctx.arc(x + sqSize / 2, y + sqSize / 2, sqSize * 0.42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prob);
          ctx.stroke();
          ctx.restore();

          // Texto de porcentaje |psi|^2
          ctx.save();
          ctx.fillStyle = piece.color === 'w' ? '#00f0ff' : '#f028dc';
          ctx.font = 'bold 11px Orbitron';
          ctx.textAlign = 'center';
          ctx.fillText(`${Math.round(prob * 100)}%`, x + sqSize / 2, y + sqSize - 6);
          ctx.restore();
        }

        // Render del glifo de la pieza
        this.drawPieceGlyph(ctx, piece.type, piece.color, x, y, sqSize, prob);
      }
    }

    // 3. Dibujar arcos de entrelazamiento en SVG Overlay
    this.renderEntanglementArcs(sqSize);
  }

  drawPieceGlyph(ctx, type, color, x, y, sqSize, prob) {
    const glyphs = {
      w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
      b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
    };

    const char = glyphs[color][type] || '?';
    ctx.save();
    ctx.font = `${sqSize * 0.65}px "Segoe UI Symbol", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Opacidad según probabilidad Born
    ctx.globalAlpha = Math.max(0.35, prob);

    if (color === 'w') {
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = prob < 1.0 ? 10 : 4;
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.shadowColor = '#f028dc';
      ctx.shadowBlur = prob < 1.0 ? 10 : 4;
    }

    ctx.fillText(char, x + sqSize / 2, y + sqSize / 2 - 2);

    // Borde blanco sutil para piezas negras para legibilidad en fondo oscuro
    if (color === 'b') {
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#c084fc';
      ctx.strokeText(char, x + sqSize / 2, y + sqSize / 2 - 2);
    }

    ctx.restore();
  }

  renderEntanglementArcs(sqSize) {
    if (!this.svgOverlay) return;
    this.svgOverlay.innerHTML = '';

    for (const link of this.board.entangledLinks) {
      const cA = ChessRules.squareToCoords(link.sqA);
      const cB = ChessRules.squareToCoords(link.sqB);
      if (!cA || !cB) continue;

      const x1 = cA.file * sqSize + sqSize / 2;
      const y1 = (7 - cA.rank) * sqSize + sqSize / 2;
      const x2 = cB.file * sqSize + sqSize / 2;
      const y2 = (7 - cB.rank) * sqSize + sqSize / 2;

      // Curva Bézier cuadrática
      const midX = (x1 + x2) / 2;
      const midY = Math.min(y1, y2) - 40;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`);
      path.setAttribute('stroke', 'hsl(45, 100%, 55%)');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('stroke-dasharray', '5,5');
      path.setAttribute('fill', 'none');
      path.setAttribute('filter', 'drop-shadow(0 0 6px hsla(45, 100%, 55%, 0.8))');

      this.svgOverlay.appendChild(path);
    }
  }
}

// Iniciar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
  window.quantumChess = new QuantumChessApp();
});
