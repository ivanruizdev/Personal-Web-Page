// --- GLOBAL STATE ---
let currentLang = 'en';
let currentMode = 'summary'; // 'summary' or 'full'
let currentTranslations = {}; // 💡 SOLO ALMACENA EL IDIOMA ACTIVO (ej: contenido de 'en.json')

// --- CORE FUNCTION: Centralized Translation Access (t for "translate") ---
/**
 * Retrieves the translation text for a given key, applying fallback logic.
 * 1. Tries to find the key in the current mode (e.g., 'full').
 * 2. If 'full' mode is active and the key isn't found, falls back to 'summary' mode.
 * 3. If still not found, falls back to the 'en' version in 'summary' mode (safety net).
 * @param {string} key - The data-key attribute value.
 * @returns {string} The translated text or a fallback error message.
 */
function t(key) {
    const activeModeContent = currentTranslations[currentMode];
    const summaryContent = currentTranslations['summary'];

    // 1. Intentar buscar en el MODO ACTUAL (e.g., 'full')
    let text = activeModeContent?.[key];

    // 2. Si el texto no se encontró y estamos en modo 'full', 
    //    aplicamos el fallback al modo 'summary' del idioma actual.
    //    Esto solo ocurre si la clave se omitió intencionalmente en 'full' (Paso 3.1).
    if (!text && currentMode === 'full') {
        text = summaryContent?.[key];
    }
    
    // 💡 IMPORTANTE: Si estamos en modo 'summary', 'text' ya contendrá el valor
    // si existe, porque 'activeModeContent' es igual a 'summaryContent'.

    // 3. Fallback final: Si el texto sigue siendo nulo/undefined (porque la clave
    //    no existe en ningún modo del idioma cargado), devolver el mensaje de error.
    return text || `!!MISSING_KEY:${key}!!`;
}

// --- BLACK LETTERS FUNCTION -- //
function processMarkdown(text) {
    if (!text) return '';
    
    // 1. Convertir negritas (**texto**) a <strong>texto</strong>
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 2. Si necesitas cursivas:
    // html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return html;
}

// --- ASYNC LOADER FUNCTION ---
/**
 * Fetches the translations for the specified language.
 * @param {string} lang - The language code (e.g., 'es', 'en').
 */
async function loadLanguage(lang) {
    if (lang === currentLang && Object.keys(currentTranslations).length > 0) {
        // Already loaded, no need to fetch again.
        return;
    }

    try {
        const response = await fetch(`./i18n/${lang}.json`);
        if (!response.ok) throw new Error('Language file not found');
        
        // 💡 Reemplazamos el objeto global con SOLO el idioma cargado
        currentTranslations = await response.json(); 
        currentLang = lang;
        
        console.log(`Translations loaded for: ${currentLang}`);
    } catch (error) {
        console.error(`Error loading translations for ${lang}. Falling back to 'en'.`, error);
        // Intentar cargar inglés si falla el idioma solicitado (seguro)
        if (lang !== 'en') { 
            await loadLanguage('en');
        } else {
            // Si falla cargar inglés, no podemos continuar.
            currentTranslations = {}; 
        }
    }
}


// --- HELPER FUNCTION: Updates all content based on current state ---
async function updateContent() {
    // 💡 AHORA: Si las traducciones no están cargadas, las cargamos ANTES de continuar.
    // Esto asegura que currentTranslations esté lleno antes de llamar a t(key).
    if (Object.keys(currentTranslations).length === 0) {
        // En este punto SÓLO se llama a loadLanguage si currentTranslations está vacío.
        // En el inicio, 'currentLang' es el idioma detectado/por defecto ('en').
        await loadLanguage(currentLang); 
    }
    
    // Si la carga falló y currentTranslations sigue vacío, salimos para evitar errores.
    if (Object.keys(currentTranslations).length === 0) {
         console.error("Critical error: No translations loaded.");
         return; 
    }
    
    // ... (El resto de tu función updateContent permanece igual)

    const baseContent = currentTranslations['summary']; 

    // 1. Update text content
    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        const text = t(key); 
        
        if (text) {
            // 💡 OPTIMIZADO: Usar la función utilitaria
            const htmlContent = processMarkdown(text);
            
            // Usar innerHTML ya que el contenido puede tener etiquetas <strong>
            el.innerHTML = htmlContent;
            
            // Nota: Ya no es necesario el chequeo 'if (text.includes("**"))'
        }
    });

    // 2. Update language and mode controls
    document.documentElement.lang = baseContent['html-lang'] || currentLang;
    document.getElementById('current-lang-display').textContent = currentLang.toUpperCase();
    
    const toggleText = t('mode-toggle-text');
    document.getElementById('mode-toggle').textContent = toggleText;

    // 3. Toggle visibility based on mode
    const fullModeElement = document.getElementById('full-mode-experience');
    const modeToggleBtn = document.getElementById('mode-toggle');

    if (currentMode === 'full') {
        fullModeElement.classList.remove('hidden');
        modeToggleBtn.classList.add('bg-gray-700');
        modeToggleBtn.classList.remove('bg-dark-card');
    } else {
        fullModeElement.classList.add('hidden');
        modeToggleBtn.classList.add('bg-dark-card');
        modeToggleBtn.classList.remove('bg-gray-700');
    }
    
    // 4. Update Nav titles for consistency
    document.querySelector('.nav-link[href="#about"]').textContent = t('nav-about');
    document.querySelector('.nav-link[href="#experience"]').textContent = t('nav-experience');
    document.querySelector('.nav-link[href="#technologies"]').textContent = t('nav-technologies');
    document.querySelector('.nav-link[href="#education"]').textContent = t('nav-education');
}
// --- EVENT LISTENERS INITIALIZATION (La clave de la corrección) ---
document.addEventListener('DOMContentLoaded', async () => {
    const modeToggleBtn = document.getElementById('mode-toggle');
    const languageMenu = document.getElementById('language-menu');
    
    // 💡 PASO CRÍTICO: INICIALIZACIÓN ASÍNCRONA
    // 1. Detectar el idioma del navegador o usar 'en' como fallback inicial
    const initialLang = navigator.language.split('-')[0] || 'en';
    currentLang = initialLang;
    
    // 2. LLAMAR A updateContent, el cual ahora maneja la carga asíncrona del JSON
    await updateContent(); 
    
    // El resto del código de listeners y scroll (que no necesita await) se puede ejecutar
    
    // --- LANGUAGE TOGGLE LISTENER ---
    languageMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const newLang = e.target.getAttribute('data-lang');
            // Cargar el nuevo idioma
            await loadLanguage(newLang);
            updateContent(); // Actualiza la interfaz con el nuevo idioma
        });
    });

    // --- MODE TOGGLE LISTENER ---
    modeToggleBtn.addEventListener('click', () => {
        currentMode = currentMode === 'summary' ? 'full' : 'summary';
        updateContent(); // El idioma ya está cargado, no necesita await
    });

    // --- SMOOTH SCROLL AND ACTIVE STATE LOGIC (Retained) ---
    // ... (Tu lógica de scroll y estado activo permanece igual)
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const id = entry.target.getAttribute('id');
            const navLink = document.querySelector(`.nav-link[href="#${id}"]`);

            if (navLink) {
                navLinks.forEach(link => link.classList.remove('active'));
                if (entry.isIntersecting) {
                    navLink.classList.add('active');
                }
            }
        });
    }, options);

    sections.forEach(section => {
        observer.observe(section);
    });
});