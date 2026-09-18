const timeElement = document.querySelector('#local-time');
const glow = document.querySelector('.cursor-glow');
const filterButtons = document.querySelectorAll('.filter-button');
const projectCards = document.querySelectorAll('.project-card');
function updateClock() {
  const now = new Date();
  timeElement.textContent = now.toLocaleTimeString('en-US', {
    timeZone: 'America/Chicago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

updateClock();
setInterval(updateClock, 1000);

window.addEventListener('pointermove', (event) => {
  glow.style.left = `${event.clientX}px`;
  glow.style.top = `${event.clientY}px`;
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    projectCards.forEach((card) => {
      card.classList.toggle('is-hidden', filter !== 'all' && card.dataset.category !== filter);
    });
  });
});

const civicCheatCode = 'JAXXGOLD';
const civicCars = {
  civicTypeR: { name: 'Honda Civic Type R', basePower: 1, price: 0 },
  hellcat: { name: 'Dodge Challenger SRT Hellcat', basePower: 4, price: 18000 },
};
const civicStorageKey = 'jaxx-civic-clicker';
const civicGame = {
  selectedCar: 'civicTypeR',
  miles: 0,
  cash: 0,
  infiniteMoney: false,
  cars: {
    civicTypeR: { owned: true, engineLevel: 0, passiveLevel: 0 },
    hellcat: { owned: false, engineLevel: 0, passiveLevel: 0 },
  },
};
const civicElements = {
  miles: document.querySelector('#civic-miles'),
  cash: document.querySelector('#civic-cash'),
  passiveIncome: document.querySelector('#civic-passive-income'),
  power: document.querySelector('#civic-power'),
  upgrade: document.querySelector('#civic-upgrade'),
  upgradeCost: document.querySelector('#civic-upgrade-cost'),
  passive: document.querySelector('#civic-passive'),
  passiveCost: document.querySelector('#civic-passive-cost'),
  carButtons: document.querySelectorAll('.civic-car-select'),
  race: document.querySelector('#civic-race'),
  raceStatus: document.querySelector('#civic-race-status'),
  message: document.querySelector('#civic-message'),
  illustration: document.querySelector('#civic-canvas'),
  pedal: document.querySelector('#civic-pedal'),
  audioStart: document.querySelector('#civic-audio-start'),
};

function loadCivicGame() {
  const savedGame = localStorage.getItem(civicStorageKey);
  if (!savedGame) return;
  try {
    Object.assign(civicGame, JSON.parse(savedGame));
  } catch {
    localStorage.removeItem(civicStorageKey);
  }
  if (!civicCars[civicGame.selectedCar]) civicGame.selectedCar = 'civicTypeR';
  if (!civicGame.cars || typeof civicGame.cars !== 'object') {
    civicGame.cars = {
      civicTypeR: { owned: true, engineLevel: civicGame.engineLevel || 0, passiveLevel: 0 },
      hellcat: { owned: false, engineLevel: 0, passiveLevel: 0 },
    };
  }
  Object.keys(civicCars).forEach((carId) => {
    const car = civicGame.cars[carId] || {};
    civicGame.cars[carId] = {
      owned: carId === 'civicTypeR' || car.owned === true,
      engineLevel: Number.isFinite(car.engineLevel) ? car.engineLevel : 0,
      passiveLevel: Number.isFinite(car.passiveLevel) ? car.passiveLevel : 0,
    };
  });
  if (!civicGame.cars[civicGame.selectedCar].owned) civicGame.selectedCar = 'civicTypeR';
  if (!Number.isFinite(civicGame.miles)) civicGame.miles = 0;
  if (!Number.isFinite(civicGame.cash)) civicGame.cash = 0;
  if (typeof civicGame.infiniteMoney !== 'boolean') civicGame.infiniteMoney = false;
}

function saveCivicGame() {
  localStorage.setItem(civicStorageKey, JSON.stringify(civicGame));
}

function activateInfiniteMoney() {
  civicGame.infiniteMoney = true;
  civicGame.cash = Number.MAX_SAFE_INTEGER;
  civicElements.message.textContent = 'Infinite money activated. The garage has unlimited cash.';
  saveCivicGame();
  updateCivicDisplay();
}

function toggleSettingsModal(forceOpen) {
  const modal = document.querySelector('#settings-modal');
  const shouldShow = typeof forceOpen === 'boolean' ? forceOpen : modal.classList.contains('hidden');
  modal.classList.toggle('hidden', !shouldShow);
  modal.setAttribute('aria-hidden', String(!shouldShow));
  if (shouldShow) {
    const input = document.querySelector('#settings-code');
    input.focus();
    input.select();
  }
}

function handleSettingsCode() {
  const input = document.querySelector('#settings-code');
  const typedCode = (input.value || '').trim().toUpperCase();
  if (typedCode === civicCheatCode) {
    activateInfiniteMoney();
    toggleSettingsModal(false);
    input.value = '';
    return;
  }
  civicElements.message.textContent = 'That code is invalid. Try again.';
  input.value = '';
  input.focus();
}

function getCivicPower() {
  const car = civicCars[civicGame.selectedCar];
  return car.basePower + civicGame.cars[civicGame.selectedCar].engineLevel;
}

function getCivicUpgradeCost() {
  const car = civicCars[civicGame.selectedCar];
  const level = civicGame.cars[civicGame.selectedCar].engineLevel;
  return (car.basePower === 1 ? 25 : 125) * (level + 1);
}

function getCivicPassiveCost() {
  const car = civicCars[civicGame.selectedCar];
  const level = civicGame.cars[civicGame.selectedCar].passiveLevel;
  return (car.basePower === 1 ? 75 : 300) * (level + 1);
}

function getPassiveIncomePerSecond() {
  return Object.entries(civicCars).reduce((income, [carId, car]) => {
    const progress = civicGame.cars[carId];
    return income + (progress.owned ? progress.passiveLevel * car.basePower : 0);
  }, 0);
}

function updateCivicDisplay() {
  const selectedCar = civicCars[civicGame.selectedCar];
  const selectedProgress = civicGame.cars[civicGame.selectedCar];
  civicElements.miles.textContent = Math.floor(civicGame.miles);
  civicElements.cash.textContent = civicGame.infiniteMoney ? '∞' : Math.floor(civicGame.cash);
  civicElements.passiveIncome.textContent = getPassiveIncomePerSecond();
  civicElements.power.textContent = getCivicPower();
  civicElements.upgradeCost.textContent = getCivicUpgradeCost();
  civicElements.passiveCost.textContent = getCivicPassiveCost();
  civicElements.upgrade.textContent = `tune ${selectedCar.name}`;
  civicElements.upgrade.insertAdjacentHTML('beforeend', ` <span>$<b>${getCivicUpgradeCost()}</b></span>`);
  civicElements.passive.disabled = !selectedProgress.owned;
  civicElements.carButtons.forEach((button) => {
    const carId = button.dataset.car;
    const car = civicCars[carId];
    const progress = civicGame.cars[carId];
    button.classList.toggle('is-active', carId === civicGame.selectedCar);
    button.textContent = progress.owned ? `${car.name} ${carId === civicGame.selectedCar ? '(selected)' : 'select'}` : `buy ${car.name}`;
    button.insertAdjacentHTML('beforeend', ` <span>${progress.owned ? 'owned' : `$${car.price}`}</span>`);
  });
  window.dispatchEvent(new CustomEvent('civic-garage-updated'));
}

const civicMusicStorageKey = 'jaxx-civic-music-enabled';
const civicEngineSoundUrl = 'assets/civic-type-r-engine.mp3';
const civicMusic = new Audio(civicEngineSoundUrl);
let civicMusicEnabled = localStorage.getItem(civicMusicStorageKey) !== 'false';
let civicRevContext;
let civicRevSource;
let civicRevGain;
let civicRevBuffer;
let civicRevLoad;
let civicRevAnimationFrame;
let civicRevInput = false;
let civicRpm = 900;
let civicRaceTimer;
let civicRaceEndsAt;

function startCivicMusic() {
  if (!civicMusicEnabled) return Promise.resolve();
  civicMusic.loop = true;
  civicMusic.volume = 0.2;
  return civicMusic.play();
}

function updateCivicMusicButton() {
  civicElements.audioStart.textContent = civicMusicEnabled ? 'turn music off' : 'turn music on';
  civicElements.audioStart.classList.toggle('is-ready', civicMusicEnabled);
}

function toggleCivicMusic() {
  civicMusicEnabled = !civicMusicEnabled;
  localStorage.setItem(civicMusicStorageKey, civicMusicEnabled);
  if (civicMusicEnabled) {
    startCivicMusic().catch(() => {
      civicElements.message.textContent = 'Music is blocked. Check your browser sound or tab mute.';
    });
  } else {
    civicMusic.pause();
  }
  updateCivicMusicButton();
}

async function loadCivicRevBuffer() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('Web Audio is unavailable');
  if (!civicRevContext) civicRevContext = new AudioContextConstructor();
  if (!civicRevLoad) {
    civicRevLoad = fetch(civicEngineSoundUrl)
      .then((response) => response.arrayBuffer())
      .then((audioData) => civicRevContext.decodeAudioData(audioData));
  }
  civicRevBuffer = await civicRevLoad;
  return civicRevBuffer;
}

async function startCivicEngineModel() {
  const buffer = await loadCivicRevBuffer();
  await civicRevContext.resume();
  if (civicRevSource) return;

  civicRevSource = civicRevContext.createBufferSource();
  civicRevGain = civicRevContext.createGain();
  civicRevSource.buffer = buffer;
  civicRevSource.loop = true;
  civicRevSource.loopStart = buffer.duration * 0.25;
  civicRevSource.loopEnd = buffer.duration * 0.7;
  civicRevSource.playbackRate.value = 0.55;
  civicRevGain.gain.value = 0.18;
  civicRevSource.connect(civicRevGain).connect(civicRevContext.destination);
  civicRevSource.start();
}

function driveCivic() {
  const power = getCivicPower();
  civicGame.miles += power;
  if (civicGame.infiniteMoney) {
    civicGame.cash = Number.MAX_SAFE_INTEGER;
  } else {
    civicGame.cash += power;
  }
  civicElements.message.textContent = `${civicCars[civicGame.selectedCar].name} logged ${power} mile${power === 1 ? '' : 's'}.`;
  saveCivicGame();
  updateCivicDisplay();
}

function updateCivicRev() {
  const targetRpm = civicRevInput ? 7000 : 900;
  civicRpm += (targetRpm - civicRpm) * 0.075;
  const rpmProgress = Math.max(0, Math.min(1, (civicRpm - 900) / 6100));
  const now = civicRevContext?.currentTime || 0;

  if (civicRevSource && civicRevGain) {
    civicRevSource.playbackRate.setTargetAtTime(0.55 + rpmProgress * 0.8, now, 0.06);
    civicRevGain.gain.setTargetAtTime(0.18 + rpmProgress * 0.42, now, 0.06);
  }
  if (!civicRevInput && civicRpm < 950) {
    if (civicRevSource) {
      civicRevSource.stop();
      civicRevSource.disconnect();
      civicRevSource = undefined;
    }
    civicRevGain = undefined;
    civicRevAnimationFrame = undefined;
    return;
  }
  civicRevAnimationFrame = window.requestAnimationFrame(updateCivicRev);
}

function startCivicRev() {
  if (civicElements.pedal.classList.contains('is-pressed')) return;
  civicElements.pedal.classList.add('is-pressed');
  civicRevInput = true;
  civicElements.message.textContent = 'Engine revving...';
  startCivicEngineModel().then(() => {
    if (!civicRevAnimationFrame) {
      civicRevAnimationFrame = window.requestAnimationFrame(updateCivicRev);
    }
  }).catch(() => {
    civicElements.message.textContent = 'Audio is blocked. Check your browser sound or tab mute.';
  });
}

function stopCivicRev() {
  civicElements.pedal.classList.remove('is-pressed');
  civicRevInput = false;
  if (!civicRevAnimationFrame) {
    civicRevAnimationFrame = window.requestAnimationFrame(updateCivicRev);
  }
}

function tuneCivic() {
  const cost = getCivicUpgradeCost();
  if (!civicGame.infiniteMoney && civicGame.cash < cost) {
    civicElements.message.textContent = `You need $${cost - Math.floor(civicGame.cash)} more cash to tune it.`;
    return;
  }
  if (!civicGame.infiniteMoney) {
    civicGame.cash -= cost;
  }
  civicGame.cars[civicGame.selectedCar].engineLevel += 1;
  civicElements.message.textContent = `Engine tuned. Now earning ${getCivicPower()} miles per drive.`;
  saveCivicGame();
  updateCivicDisplay();
}

function selectOrBuyCivicCar(event) {
  const carId = event.currentTarget.dataset.car;
  const car = civicCars[carId];
  const progress = civicGame.cars[carId];
  if (!progress.owned) {
    if (!civicGame.infiniteMoney && civicGame.cash < car.price) {
      civicElements.message.textContent = `You need $${car.price - Math.floor(civicGame.cash)} more cash to buy the ${car.name}.`;
      return;
    }
    if (!civicGame.infiniteMoney) {
      civicGame.cash -= car.price;
    }
    progress.owned = true;
    civicElements.message.textContent = `${car.name} added to the garage. Choose it whenever you want more power.`;
  }
  civicGame.selectedCar = carId;
  saveCivicGame();
  updateCivicDisplay();
}

function addPassiveUpgrade() {
  const cost = getCivicPassiveCost();
  if (!civicGame.infiniteMoney && civicGame.cash < cost) {
    civicElements.message.textContent = `You need $${cost - Math.floor(civicGame.cash)} more cash for this income upgrade.`;
    return;
  }
  const progress = civicGame.cars[civicGame.selectedCar];
  progress.passiveLevel += 1;
  if (!civicGame.infiniteMoney) {
    civicGame.cash -= cost;
  }
  civicElements.message.textContent = `${civicCars[civicGame.selectedCar].name} now earns ${getPassiveIncomePerSecond()} cash per second across the garage.`;
  saveCivicGame();
  updateCivicDisplay();
}

function collectPassiveIncome() {
  const income = getPassiveIncomePerSecond();
  if (!income && !civicGame.infiniteMoney) return;
  if (civicGame.infiniteMoney) {
    civicGame.cash = Number.MAX_SAFE_INTEGER;
  } else {
    civicGame.cash += income;
  }
  saveCivicGame();
  updateCivicDisplay();
}

function finishCivicRace() {
  civicRaceTimer = undefined;
  civicElements.race.disabled = false;
  const power = getCivicPower();
  const reward = power * 10;
  civicGame.miles += power * 5;
  civicGame.cash += reward;
  civicElements.raceStatus.textContent = `Time trial complete. Bonus: $${reward} and ${power * 5} miles.`;
  civicElements.message.textContent = 'Clean run. The garage account is looking healthier.';
  saveCivicGame();
  updateCivicDisplay();
}

function updateCivicRace() {
  const secondsLeft = Math.max(0, Math.ceil((civicRaceEndsAt - Date.now()) / 1000));
  civicElements.raceStatus.textContent = `Time trial live: ${secondsLeft}s left. Hold your line.`;
  if (secondsLeft === 0) {
    finishCivicRace();
    return;
  }
  civicRaceTimer = window.setTimeout(updateCivicRace, 250);
}

function startCivicRace() {
  if (civicRaceTimer) return;
  civicElements.race.disabled = true;
  civicRaceEndsAt = Date.now() + 10000;
  civicElements.message.textContent = 'The lights are green. Stay focused.';
  updateCivicRace();
}

loadCivicGame();
updateCivicDisplay();
updateCivicMusicButton();
const settingsButton = document.querySelector('#settings-button');
const settingsClose = document.querySelector('#settings-close');
const settingsSubmit = document.querySelector('#settings-submit');
const settingsCodeInput = document.querySelector('#settings-code');
settingsButton.addEventListener('click', () => toggleSettingsModal());
settingsClose.addEventListener('click', () => toggleSettingsModal(false));
settingsSubmit.addEventListener('click', handleSettingsCode);
settingsCodeInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') handleSettingsCode();
});
document.querySelector('#settings-modal').addEventListener('click', (event) => {
  if (event.target === event.currentTarget) toggleSettingsModal(false);
});
document.querySelector('#civic-drive').addEventListener('click', driveCivic);
document.querySelector('#civic-upgrade').addEventListener('click', tuneCivic);
civicElements.passive.addEventListener('click', addPassiveUpgrade);
civicElements.carButtons.forEach((button) => button.addEventListener('click', selectOrBuyCivicCar));
civicElements.race.addEventListener('click', startCivicRace);
window.addEventListener('garage-car-focused', (event) => {
  const carId = event.detail?.carId;
  if (!civicGame.cars[carId]?.owned) return;
  civicGame.selectedCar = carId;
  saveCivicGame();
  updateCivicDisplay();
});
civicElements.pedal.addEventListener('pointerdown', startCivicRev);
civicElements.pedal.addEventListener('pointerup', stopCivicRev);
civicElements.pedal.addEventListener('pointercancel', stopCivicRev);
civicElements.pedal.addEventListener('pointerleave', stopCivicRev);
civicElements.pedal.addEventListener('keydown', (event) => {
  if ((event.key === ' ' || event.key === 'Enter') && !civicElements.pedal.classList.contains('is-pressed')) startCivicRev();
});
civicElements.pedal.addEventListener('keyup', (event) => {
  if (event.key === ' ' || event.key === 'Enter') stopCivicRev();
});
civicElements.pedal.addEventListener('blur', stopCivicRev);
civicElements.audioStart.addEventListener('click', toggleCivicMusic);
window.setInterval(collectPassiveIncome, 1000);
