import { reactive } from 'vue';

const FLASH_TIMEOUT = 2600;
const flashState = reactive({
  items: []
});

let flashId = 0;

const normalizeType = value => {
  const nextType = String(value || '').trim().toLowerCase();
  return nextType === 'error' ? 'error' : 'success';
};

export const removeFlash = id => {
  flashState.items = flashState.items.filter(item => item.id !== id);
};

export const flash = (message, type = 'success', timeout = FLASH_TIMEOUT) => {
  const nextMessage = String(message || '').trim();

  if (!nextMessage) {
    return null;
  }

  flashId += 1;

  const item = {
    id: flashId,
    message: nextMessage,
    type: normalizeType(type)
  };

  flashState.items = [...flashState.items, item];

  if (timeout > 0) {
    window.setTimeout(() => {
      removeFlash(item.id);
    }, timeout);
  }

  return item.id;
};

const FlashPlugin = {
  install(app) {
    app.config.globalProperties.flash = flash;
  }
};

export { flashState };
export default FlashPlugin;
