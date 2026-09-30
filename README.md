# ⚓ HeartMed — Frontend UI (React + Tailwind CSS)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-In%20Development-brightgreen)](#)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

## 📌 Descripción General

**HeartMed UI** es la interfaz gráfica del sistema de gestión médica e inventario para la tripulación de los **Piratas Heart**, liderados por el Capitán **Trafalgar Law**. 

Diseñada como una *Single Page Application* (SPA) moderna, rápida y responsiva, esta aplicación consume la **API REST en C++ (Crow)** para visualizar estados clínicos, gestionar el stock de suministros del *Polar Tang* y activar protocolos de emergencia en tiempo real.

---

## 🎨 Identidad Visual y Temática

* **Paleta Cromática:**
  * **Amarillo Quirúrgico (Primary):** `#FFD700` (Inspirado en Trafalgar Law)
  * **Negro / Fondo Oscuro:** `#121212` / `#1E1E1E`
  * **Verde / Azul Médico (Accents):** `#10B981` / `#3B82F6`
* **Estilo Visual:** Interfaz temática e intuitiva inspirada en los tableros tácticos y médicos del submarino *Polar Tang*.

---

## 🛠️ Stack Tecnológico

* **Librería UI:** React 18
* **Herramienta de Build:** Vite
* **Estilos:** Tailwind CSS
* **Navegación / Rutas:** React Router DOM
* **Cliente HTTP:** Axios
* **Iconografía:** Lucide React

---

## 📂 Estructura del Proyecto

La aplicación sigue una arquitectura modular en React:

```text
├── src/
│   ├── api/          # Cliente Axios configurado e integración con la API C++
│   ├── components/   # Componentes atómicos e independientes (Botones, Modales, Cards, Nav)
│   ├── context/      # Contextos globales de React (Autenticación, Sesión, Estado)
│   ├── hooks/        # Custom Hooks para manejo de lógica UI y llamadas asíncronas
│   ├── pages/        # Vistas principales (Dashboard, Historias Clínicas, Inventario)
│   ├── styles/       # Hojas de estilo y directivas globales de Tailwind CSS
│   ├── types/        # Modelos e interfaces de datos (contratos JSON de la API)
│   ├── App.jsx       # Rutas y layout principal
│   └── main.jsx      # Punto de entrada de React
├── .env              # Variables de entorno locales
├── .env.example      # Plantilla de configuración de entorno
├── tailwind.config.js# Configuración de colores y temas de Tailwind
├── vite.config.js    # Configuración de la herramienta de build Vite
└── README.md         # Documentación del frontend
