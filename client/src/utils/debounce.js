export const debounce = (callback, wait = 250) => {
  let timer = null;

  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => callback(...args), wait);
  };
};

