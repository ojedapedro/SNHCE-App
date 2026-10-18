/**
 * Setup de pruebas para app-clinica
 *
 * Inyecta fake-indexeddb en el entorno de test (jsdom no incluye IndexedDB).
 * fake-indexeddb es una implementación completa de la spec IDB en memoria.
 */
import 'fake-indexeddb/auto';
