# ⚛️ Superposition Chess: Entangled Gambit

> **Capa 4 de Computación Cuántica Híbrida del Monorrepo Codex**  
> *Ajedrez en Espacio de Hilbert con Superposición Coherente, Entrelazamiento Bell y Colapso por Regla de Born.*

---

## 📌 Descripción del Proyecto

`Superposition Chess: Entangled Gambit` es un videojuego web de ajedrez táctico cuántico en el que las piezas existen como estados en un espacio de Hilbert discreto $\mathcal{H} = (\mathbb{C}^2)^{\otimes n}$. Las piezas no están limitadas a una sola casilla determinista: los jugadores pueden aplicar compuertas unitarias cuánticas para dividir piezas en superposición, entrelazar piezas aliadas o enemigas mediante enlaces tipo CNOT/Bell, y forzar mediciones proyectivas de colapso según la **Regla de Born** ($P = |\langle \psi_i | \Psi \rangle|^2$) al disputar el control de un escaque.

---

## 🎮 Mecánicas Cuánticas de Juego

1. **Movimiento Clásico ($\hat{X}$)**:
   - Desplazamiento determinista estándar sobre el tablero con las reglas del ajedrez tradicional.
2. **Split Move ($\hat{H}$ / Hadamard & $\sqrt{\text{iSWAP}}$)**:
   - Divide una pieza clásica en dos casillas destino legales.
   - Amplitud resultante: $|\alpha|^2 = 0.5$ y $|\beta|^2 = 0.5$ (50% de probabilidad en cada rama).
3. **Merge Move (Interferencia de Fase Coherente)**:
   - Dos ramas de una misma pieza en superposición pueden converger en una casilla común, sumando vectorialmente sus amplitudes complejas $(\alpha_1 + \alpha_2)$.
4. **Entangle CNOT (Entrelazamiento Cuántico)**:
   - Crea una correlación cuántica no-local entre dos piezas. Medir una de ellas provoca el colapso inducido o la modificación de estado de su contraparte.
5. **Medición Proyectiva y Colapso de Born**:
   - Cuando una pieza intenta capturar o acceder a un escaque ocupado por estados en superposición, se activa un rayo de medición proyectiva que colapsa la función de onda:
     $$P(|1\rangle) = |\alpha|^2$$
   - Si la pieza se materializa, todas sus ramas alternativas colapsan a 0 instantáneamente. Si el escaque resulta vacío ($|0\rangle$), la rama se aniquila y la pieza sobrevive en sus otras posiciones.

---

## 🤖 Inteligencia Artificial Cuántica (Expectiminimax)

El contrincante de IA utiliza un algoritmo **Expectiminimax** adaptado a espacios de Hilbert:
- Evalúa el valor esperado de las piezas:
  $$E[V] = \sum_{x, y} P(x, y) \cdot \text{ValorPieza}(x, y) + \text{BonificaciónCentro} + \text{BonificaciónEntrelazamiento}$$
- Pondera tanto jugadas clásicas deterministas como divisiones cuánticas tácticas que generan incertidumbre para el rival.

---

## 💻 Exportación de Circuitos a OpenQASM 3.0 y Google Cirq

Cada movimiento de la partida se traduce en tiempo real a:
- **OpenQASM 3.0**: Formato estándar ejecutable en computadores cuánticos reales (IBM Quantum, Rigetti, Quantinuum).
- **Google Cirq (Python)**: Script exportable listo para ejecutarse en simuladores locales (`cirq.Simulator`) o aceleradores (`qsim`).

---

## 🛠️ Tecnologías y Stack

- **Frontend**: HTML5 Semántico, Vanilla CSS3 (HSL Dark Cyber-Quantum con Glassmorphism), ES2024 Modules.
- **Gráficos**: Canvas 2D interactivo con aros de probabilidad cuántica y capas SVG para arcos Bézier de entrelazamiento.
- **Audio**: Web Audio API sintetizado en tiempo real (barridos de frecuencia para transiciones cuánticas y truenos sintéticos para el colapso de Born).
- **Formatos Cuánticos**: OpenQASM 3.0, Google Cirq Python.
