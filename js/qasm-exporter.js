/**
 * QASMExporter - Exportador de partidas de Ajedrez Cuántico a circuitos OpenQASM 3.0 y Google Cirq
 */

export class QASMExporter {
  /**
   * Genera código OpenQASM 3.0 a partir del historial de movimientos y estado del tablero
   */
  static toOpenQASM(history, board) {
    let qasm = `// ========================================================\n`;
    qasm += `// Superposition Chess: Entangled Gambit - Quantum Circuit\n`;
    qasm += `// Format: OpenQASM 3.0\n`;
    qasm += `// Generated: ${new Date().toISOString()}\n`;
    qasm += `// ========================================================\n\n`;
    qasm += `OPENQASM 3.0;\n`;
    qasm += `include "stdgates.inc";\n\n`;

    // Asignar qubits a las casillas activas o piezas
    const pieces = Array.from(board.pieces.values());
    const qubitCount = Math.max(8, Math.min(pieces.length, 32));
    qasm += `// Definición de registro cuántico principal\n`;
    qasm += `qubit[${qubitCount}] q;\n`;
    qasm += `bit[${qubitCount}] c;\n\n`;
    qasm += `// Inicialización en estado base |0...0>\n`;
    qasm += `reset q;\n\n`;

    // Mapear historial
    qasm += `// Secuencia de Operaciones Unitarias del Gambito:\n`;
    history.forEach((h, idx) => {
      const qIdx = idx % qubitCount;
      const targetQ = (idx + 1) % qubitCount;

      if (h.type === 'SPLIT') {
        if (h.gate === 'HADAMARD') {
          qasm += `h q[${qIdx}]; // Turn ${idx + 1}: Split Hadamard (${h.from} -> ${h.to1}, ${h.to2})\n`;
        } else {
          // sqrt(iSWAP) aproximado o compuerta de rotación
          qasm += `rz(pi/4) q[${qIdx}];\n`;
          qasm += `sx q[${qIdx}]; // Turn ${idx + 1}: Split sqrt(iSWAP) (${h.from} -> ${h.to1}, ${h.to2})\n`;
        }
      } else if (h.type === 'MERGE') {
        qasm += `cx q[${qIdx}], q[${targetQ}];\n`;
        qasm += `h q[${qIdx}]; // Turn ${idx + 1}: Phase Merge into ${h.target}\n`;
      } else if (h.type === 'ENTANGLE') {
        qasm += `cx q[${qIdx}], q[${targetQ}]; // Turn ${idx + 1}: CNOT Entanglement Bell link\n`;
      } else if (h.type === 'COLLAPSE') {
        qasm += `c[${qIdx}] = measure q[${qIdx}]; // Born Collapse on ${h.square}\n`;
      } else {
        // Movimiento clásico
        qasm += `x q[${qIdx}]; // Turn ${idx + 1}: Classical Move (${h.from} -> ${h.to})\n`;
      }
    });

    qasm += `\n// Medición proyectiva final del registro cuántico\n`;
    qasm += `c = measure q;\n`;
    return qasm;
  }

  /**
   * Genera script ejecutable de Python utilizando Google Cirq
   */
  static toCirqPython(history, board) {
    let py = `"""\n`;
    py += `Superposition Chess: Entangled Gambit - Cirq Circuit Simulation\n`;
    py += `Generated on: ${new Date().toISOString()}\n`;
    py += `"""\n`;
    py += `import cirq\n\n`;
    py += `def create_quantum_chess_circuit():\n`;
    py += `    # Inicializar registros de qubits correspondientes al tablero\n`;
    py += `    qubits = cirq.LineQubit.range(16)\n`;
    py += `    circuit = cirq.Circuit()\n\n`;

    history.forEach((h, idx) => {
      const q1 = idx % 16;
      const q2 = (idx + 1) % 16;

      if (h.type === 'SPLIT') {
        if (h.gate === 'HADAMARD') {
          py += `    # Turn ${idx + 1}: Split Hadamard en ${h.from}\n`;
          py += `    circuit.append(cirq.H(qubits[${q1}]))\n`;
        } else {
          py += `    # Turn ${idx + 1}: sqrt(iSWAP) en ${h.from}\n`;
          py += `    circuit.append(cirq.ISWAP(qubits[${q1}], qubits[${q2}])**0.5)\n`;
        }
      } else if (h.type === 'MERGE') {
        py += `    # Turn ${idx + 1}: Merge con interferencia\n`;
        py += `    circuit.append(cirq.CNOT(qubits[${q1}], qubits[${q2}]))\n`;
        py += `    circuit.append(cirq.H(qubits[${q1}]))\n`;
      } else if (h.type === 'ENTANGLE') {
        py += `    # Turn ${idx + 1}: Entangle CNOT\n`;
        py += `    circuit.append(cirq.CNOT(qubits[${q1}], qubits[${q2}]))\n`;
      } else if (h.type === 'COLLAPSE') {
        py += `    # Born projective measurement on ${h.square}\n`;
        py += `    circuit.append(cirq.measure(qubits[${q1}], key='born_m_${idx}'))\n`;
      } else {
        py += `    circuit.append(cirq.X(qubits[${q1}]))  # Classical Move ${h.from}->${h.to}\n`;
      }
    });

    py += `\n    # Medición de todas las líneas\n`;
    py += `    circuit.append(cirq.measure(*qubits, key='final_state'))\n`;
    py += `    return circuit\n\n`;
    py += `if __name__ == '__main__':\n`;
    py += `    circuit = create_quantum_chess_circuit()\n`;
    py += `    print("=== Circuito Cuántico Cirq Generado ===")\n`;
    py += `    print(circuit)\n`;
    py += `    simulator = cirq.Simulator()\n`;
    py += `    result = simulator.run(circuit, repetitions=1024)\n`;
    py += `    print("\\nHistograma de Muestreo (1024 Shots):")\n`;
    py += `    print(result.histogram(key='final_state'))\n`;
    return py;
  }
}
