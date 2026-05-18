const STORAGE_KEY = "fittrack-data-v1";

const defaultState = {
  profile: null,
  workouts: [],
  meals: [],
  progress: [],
};

const state = loadState();

const profileForm = document.querySelector("#profileForm");
const workoutForm = document.querySelector("#workoutForm");
const mealForm = document.querySelector("#mealForm");
const progressForm = document.querySelector("#progressForm");

profileForm.addEventListener("submit", handleProfileSubmit);
workoutForm.addEventListener("submit", handleWorkoutSubmit);
mealForm.addEventListener("submit", handleMealSubmit);
progressForm.addEventListener("submit", handleProgressSubmit);

renderAll();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...defaultState, ...saved } : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function handleProfileSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.profile = {
    name: formData.get("name").trim(),
    goal: formData.get("goal").trim(),
    height: Number(formData.get("height")),
    weight: Number(formData.get("weight")),
  };

  saveState();
  renderAll();
}

function handleWorkoutSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.workouts.unshift({
    id: crypto.randomUUID(),
    type: formData.get("type").trim(),
    duration: Number(formData.get("duration")),
    intensity: formData.get("intensity"),
    createdAt: new Date().toISOString(),
  });

  event.currentTarget.reset();
  saveState();
  renderAll();
}

function handleMealSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.meals.unshift({
    id: crypto.randomUUID(),
    name: formData.get("name").trim(),
    calories: Number(formData.get("calories")),
    protein: Number(formData.get("protein")),
    carbs: Number(formData.get("carbs")),
    fat: Number(formData.get("fat")),
    createdAt: new Date().toISOString(),
  });

  event.currentTarget.reset();
  saveState();
  renderAll();
}

function handleProgressSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.progress.push({
    id: crypto.randomUUID(),
    date: formData.get("date"),
    weight: Number(formData.get("weight")),
    bodyFat: Number(formData.get("bodyFat")),
    waist: Number(formData.get("waist")),
  });

  state.progress.sort((a, b) => a.date.localeCompare(b.date));
  event.currentTarget.reset();
  saveState();
  renderAll();
}

function renderAll() {
  renderProfile();
  renderWorkouts();
  renderMeals();
  renderProgress();
  renderDashboard();
  seedFormDefaults();
}

function renderProfile() {
  const profileCard = document.querySelector("#profileCard");

  if (!state.profile) {
    profileCard.className = "profile-card empty-state";
    profileCard.textContent = "Henuz profil kaydedilmedi.";
    return;
  }

  profileCard.className = "profile-card";
  profileCard.innerHTML = `
    <strong>${state.profile.name}</strong>
    <div class="progress-meta">Hedef: ${state.profile.goal}</div>
    <div class="progress-meta">Boy: ${state.profile.height} cm</div>
    <div class="progress-meta">Kilo: ${state.profile.weight} kg</div>
  `;

  profileForm.elements.namedItem("name").value = state.profile.name;
  profileForm.elements.namedItem("goal").value = state.profile.goal;
  profileForm.elements.namedItem("height").value = state.profile.height;
  profileForm.elements.namedItem("weight").value = state.profile.weight;
}

function renderWorkouts() {
  const workoutList = document.querySelector("#workoutList");

  if (!state.workouts.length) {
    workoutList.className = "stack-list empty-state";
    workoutList.textContent = "Henuz antrenman eklenmedi.";
    return;
  }

  workoutList.className = "stack-list";
  workoutList.innerHTML = state.workouts
    .map(
      (workout) => `
        <article class="list-item">
          <div>
            <strong>${workout.type}</strong>
            <div class="item-meta">${formatDateTime(workout.createdAt)}</div>
          </div>
          <div class="item-meta">${workout.duration} dk • ${workout.intensity}</div>
        </article>
      `,
    )
    .join("");
}

function renderMeals() {
  const mealList = document.querySelector("#mealList");
  const todayMeals = state.meals.filter((meal) => isToday(meal.createdAt));
  const summary = todayMeals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      protein: totals.protein + meal.protein,
      carbs: totals.carbs + meal.carbs,
      fat: totals.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  document.querySelector("#summaryCalories").textContent = summary.calories;
  document.querySelector("#summaryProtein").textContent = `${summary.protein}g`;
  document.querySelector("#summaryCarbs").textContent = `${summary.carbs}g`;
  document.querySelector("#summaryFat").textContent = `${summary.fat}g`;

  if (!state.meals.length) {
    mealList.className = "stack-list empty-state";
    mealList.textContent = "Henuz ogun eklenmedi.";
    return;
  }

  mealList.className = "stack-list";
  mealList.innerHTML = state.meals
    .map(
      (meal) => `
        <article class="list-item">
          <div>
            <strong>${meal.name}</strong>
            <div class="item-meta">${formatDateTime(meal.createdAt)}</div>
          </div>
          <div class="item-meta">${meal.calories} kcal • P ${meal.protein} / C ${meal.carbs} / Y ${meal.fat}</div>
        </article>
      `,
    )
    .join("");
}

function renderProgress() {
  const progressList = document.querySelector("#progressList");

  if (!state.progress.length) {
    progressList.className = "stack-list empty-state";
    progressList.textContent = "Henuz progress verisi eklenmedi.";
    renderEmptyChart();
    return;
  }

  progressList.className = "stack-list";
  progressList.innerHTML = [...state.progress]
    .reverse()
    .map(
      (entry) => `
        <article class="list-item">
          <div>
            <strong>${formatDate(entry.date)}</strong>
            <div class="item-meta">Yag: %${entry.bodyFat} • Bel: ${entry.waist} cm</div>
          </div>
          <div class="item-meta">${entry.weight} kg</div>
        </article>
      `,
    )
    .join("");

  renderChart();
}

function renderDashboard() {
  const latestProgress = state.progress[state.progress.length - 1];
  const todayMeals = state.meals.filter((meal) => isToday(meal.createdAt));
  const todayCalories = todayMeals.reduce((total, meal) => total + meal.calories, 0);

  document.querySelector("#workoutCount").textContent = state.workouts.length;
  document.querySelector("#todayCalories").textContent = todayCalories;
  document.querySelector("#latestWeight").textContent = latestProgress ? `${latestProgress.weight} kg` : "-";
  document.querySelector("#goalSummary").textContent = state.profile?.goal || "-";
  document.querySelector("#focusMessage").textContent = buildFocusMessage(latestProgress, todayCalories);
}

function buildFocusMessage(latestProgress, todayCalories) {
  if (!state.profile) {
    return "Profilini ekleyerek kisisel hedefini belirle.";
  }

  if (!state.workouts.length) {
    return "Ilk antrenmanini ekleyip seriyi baslat.";
  }

  if (!latestProgress) {
    return "Ilerleme verisi ekleyip degisimi grafikte izle.";
  }

  return `${state.profile.goal} hedefi için bugün ${todayCalories} kcal kaydın var.`;
}

function renderChart() {
  const chart = document.querySelector("#progressChart");
  const width = 640;
  const height = 260;
  const padding = 36;
  const values = state.progress.map((item) => item.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);

  const points = state.progress.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(state.progress.length - 1, 1);
    const y = height - padding - ((item.weight - min) / span) * (height - padding * 2);
    return { x, y, label: item.date, value: item.weight };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const labels = points
    .map(
      (point) => `
        <g>
          <circle cx="${point.x}" cy="${point.y}" r="5" fill="#f97316" />
          <text x="${point.x}" y="${point.y - 12}" text-anchor="middle" font-size="11" fill="#18230f">${point.value}</text>
          <text x="${point.x}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#53624b">${formatShortDate(point.label)}</text>
        </g>
      `,
    )
    .join("");

  chart.innerHTML = `
    <rect width="${width}" height="${height}" rx="18" fill="#fff9ef" />
    <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="rgba(24,35,15,0.14)" />
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(24,35,15,0.14)" />
    <polyline fill="none" stroke="#1f6f78" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${polyline}" />
    ${labels}
  `;
}

function renderEmptyChart() {
  const chart = document.querySelector("#progressChart");
  chart.innerHTML = `
    <rect width="640" height="260" rx="18" fill="#fff9ef" />
    <text x="320" y="130" text-anchor="middle" font-size="18" fill="#53624b">
      Grafik icin progress verisi ekleyin
    </text>
  `;
}

function seedFormDefaults() {
  if (!progressForm.date.value) {
    progressForm.date.value = new Date().toISOString().split("T")[0];
  }
}

function isToday(dateString) {
  return new Date(dateString).toDateString() === new Date().toDateString();
}

function formatDateTime(dateString) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
  }).format(new Date(dateString));
}

function formatShortDate(dateString) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(dateString));
}
