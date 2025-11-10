// Default icons for different uniform types
export const DEFAULT_ICONS = {
  Shirt: '/icons/shirt-icon.svg',
  Trouser: '/icons/trouser-icon.svg',
  Blazer: '/icons/blazer-icon.svg',
  Skirt: '/icons/skirt-icon.svg',
  Tie: '/icons/uniform-icon.svg',
  Sweater: '/icons/uniform-icon.svg',
  'PE Kit': '/icons/uniform-icon.svg',
  'Lab Coat': '/icons/uniform-icon.svg',
  Socks: '/icons/uniform-icon.svg',
  Shoes: '/icons/uniform-icon.svg',
  default: '/icons/uniform-icon.svg'
};

export const getUniformIcon = (type) => {
  return DEFAULT_ICONS[type] || DEFAULT_ICONS.default;
}; 