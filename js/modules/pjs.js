let characterData = [];

export const loadCharacterData = async () => {
  try {
    const response = await fetch('../data/pjs.json');
    characterData = await response.json();
  } catch (error) {
    console.error('Error loading character data:', error);
    characterData = [
      { name: "default", src: "./img/pj/pj1.png" }
    ];
  }
};

export const getRandomCharacter = () => {
  if (characterData.length === 0) {
    return "./img/pj/pj1.png";
  }
  const randomIndex = Math.floor(Math.random() * characterData.length);
  return characterData[randomIndex].src;
};

export const getCharacterAssets = () => {
  return characterData.map(c => c.src);
};