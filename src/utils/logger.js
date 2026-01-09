export const isDebugEnabled = () => {
    if (typeof window === 'undefined') return false;
    if (window.DEBUG_LOGS) return true;
    try {
        return localStorage.getItem('debugLogs') === 'true';
    } catch (e) {
        return false;
    }
};

export const debugLog = (...args) => {
    if (isDebugEnabled()) console.log(...args);
};

export const debugWarn = (...args) => {
    if (isDebugEnabled()) console.warn(...args);
};

const modalState = {
    overlay: null,
    content: null,
    buffer: [],
    maxLines: 250,
    visible: false
};

const formatArgs = (args) => {
    return args.map((item) => {
        if (typeof item === 'string') return item;
        try {
            return JSON.stringify(item);
        } catch (e) {
            return String(item);
        }
    }).join(' ');
};

const ensureModal = () => {
    if (typeof document === 'undefined') return;
    if (modalState.overlay) return;

    const overlay = document.createElement('div');
    overlay.id = 'debug-log-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0, 0, 0, 0.65)';
    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '2000';

    const panel = document.createElement('div');
    panel.style.background = '#0b101a';
    panel.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    panel.style.borderRadius = '8px';
    panel.style.width = '70%';
    panel.style.maxWidth = '900px';
    panel.style.maxHeight = '70%';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.boxShadow = '0 20px 40px rgba(0,0,0,0.5)';

    const header = document.createElement('div');
    header.textContent = 'Debug Log';
    header.style.padding = '10px 12px';
    header.style.fontFamily = 'monospace';
    header.style.fontSize = '12px';
    header.style.color = '#cfe9ff';
    header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';

    const content = document.createElement('pre');
    content.style.margin = '0';
    content.style.padding = '12px';
    content.style.overflow = 'auto';
    content.style.color = '#e5e7eb';
    content.style.fontSize = '11px';
    content.style.lineHeight = '1.4';
    content.style.whiteSpace = 'pre-wrap';

    const footer = document.createElement('div');
    footer.style.padding = '8px 12px';
    footer.style.display = 'flex';
    footer.style.justifyContent = 'space-between';
    footer.style.alignItems = 'center';
    footer.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';

    const hint = document.createElement('div');
    hint.textContent = "Press ']' to close";
    hint.style.fontFamily = 'monospace';
    hint.style.fontSize = '11px';
    hint.style.color = '#9aa3b2';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.background = 'rgba(255, 255, 255, 0.08)';
    closeBtn.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    closeBtn.style.color = '#e5e7eb';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.padding = '4px 10px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => {
        overlay.style.display = 'none';
        modalState.visible = false;
    };

    footer.appendChild(hint);
    footer.appendChild(closeBtn);
    panel.appendChild(header);
    panel.appendChild(content);
    panel.appendChild(footer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    modalState.overlay = overlay;
    modalState.content = content;
};

export const logToModal = (...args) => {
    const line = formatArgs(args);
    if (!line) return;
    modalState.buffer.push(line);
    if (modalState.buffer.length > modalState.maxLines) {
        modalState.buffer.splice(0, modalState.buffer.length - modalState.maxLines);
    }
    if (modalState.visible && modalState.content) {
        modalState.content.textContent = modalState.buffer.join('\n');
        modalState.content.scrollTop = modalState.content.scrollHeight;
    }
};

export const toggleLogModal = () => {
    ensureModal();
    if (!modalState.overlay) return;
    modalState.visible = !modalState.visible;
    modalState.overlay.style.display = modalState.visible ? 'flex' : 'none';
    if (modalState.visible && modalState.content) {
        modalState.content.textContent = modalState.buffer.join('\n');
        modalState.content.scrollTop = modalState.content.scrollHeight;
    }
};
