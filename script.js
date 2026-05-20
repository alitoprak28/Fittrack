const STORAGE_KEY = "fittrack-app-v3";
const PREVIOUS_STORAGE_KEY = "fittrack-app-v2";
const LEGACY_STORAGE_KEY = "fittrack-data-v1";
const DEFAULT_ADMIN = {
  id: "default-admin",
  name: "fitTrack Admin",
  email: "admin@fittrack.local",
  password: "admin123",
};

const defaultState = {
  admins: [DEFAULT_ADMIN],
  users: [],
  session: {
    type: null,
    id: null,
  },
  workouts: [],
  meals: [],
  progress: [],
  waterLogs: [],
};

const state = loadState();

const registerForm = document.querySelector("#registerForm");
const loginForm = document.querySelector("#loginForm");
const logoutButton = document.querySelector("#logoutButton");
const profileForm = document.querySelector("#profileForm");
const workoutForm = document.querySelector("#workoutForm");
const mealForm = document.querySelector("#mealForm");
const waterForm = document.querySelector("#waterForm");
const progressForm = document.querySelector("#progressForm");
const waterQuickActions = document.querySelector("#waterQuickActions");
const messageBar = document.querySelector("#messageBar");

registerForm.addEventListener("submit", handleRegisterSubmit);
loginForm.addEventListener("submit", handleUserLoginSubmit);
logoutButton.addEventListener("click", handleLogout);
profileForm.addEventListener("submit", handleProfileSubmit);
workoutForm.addEventListener("submit", handleWorkoutSubmit);
mealForm.addEventListener("submit", handleMealSubmit);
waterForm.addEventListener("submit", handleWaterSubmit);
progressForm.addEventListener("submit", handleProgressSubmit);
waterQuickActions.addEventListener("click", handleWaterQuickAdd);

renderAll();

function loadState() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      return normalizeState(JSON.parse(current));
    }

    const previous = localStorage.getItem(PREVIOUS_STORAGE_KEY);
    if (previous) {
      return migrateFromV2(JSON.parse(previous));
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      return migrateFromLegacy(JSON.parse(legacy));
    }
  } catch {
    return normalizeState({ ...defaultState });
  }

  return normalizeState({ ...defaultState });
}

function normalizeState(candidate) {
  return {
    admins: Array.isArray(candidate.admins) && candidate.admins.length ? candidate.admins : [DEFAULT_ADMIN],
    users: Array.isArray(candidate.users) ? candidate.users : [],
    session: candidate.session || { type: null, id: null },
    workouts: Array.isArray(candidate.workouts) ? candidate.workouts : [],
    meals: Array.isArray(candidate.meals) ? candidate.meals : [],
    progress: Array.isArray(candidate.progress) ? candidate.progress : [],
    waterLogs: Array.isArray(candidate.waterLogs) ? candidate.waterLogs : [],
  };
}

function migrateFromV2(previous) {
  const migratedUsers = (previous.users || []).map((user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    password: user.password,
    createdAt: user.createdAt || new Date().toISOString(),
    profile: user.profile || {
      age: "",
      height: "",
      currentWeight: "",
    },
    targets: user.targets || {
      goalType: "Formu korumak",
      targetWeight: "",
      dailyStepGoal: 10000,
      dailyWaterGoal: 2500,
      weeklyWorkoutGoal: 4,
    },
  }));

  return normalizeState({
    admins: [DEFAULT_ADMIN],
    users: migratedUsers,
    session: previous.currentUserId ? { type: "user", id: previous.currentUserId } : { type: null, id: null },
    workouts: previous.workouts || [],
    meals: previous.meals || [],
    progress: previous.progress || [],
    waterLogs: previous.waterLogs || [],
  });
}

function migrateFromLegacy(legacy) {
  const userId = crypto.randomUUID();
  const today = new Date().toISOString();

  return normalizeState({
    admins: [DEFAULT_ADMIN],
    users: [
      {
        id: userId,
        fullName: legacy.profile?.name || "İlk Kullanıcı",
        email: "demo@fittrack.local",
        password: "123456",
        createdAt: today,
        profile: {
          age: "",
          height: legacy.profile?.height || "",
          currentWeight: legacy.profile?.weight || "",
        },
        targets: {
          goalType: legacy.profile?.goal || "Formu korumak",
          targetWeight: legacy.profile?.weight || "",
          dailyStepGoal: 10000,
          dailyWaterGoal: 2500,
          weeklyWorkoutGoal: 4,
        },
      },
    ],
    session: {
      type: "user",
      id: userId,
    },
    workouts: (legacy.workouts || []).map((workout) => ({
      ...workout,
      userId,
      date: isoDate(workout.createdAt),
      focus: workout.type || "Tüm Vücut",
      caloriesBurned: 0,
      notes: "",
    })),
    meals: (legacy.meals || []).map((meal) => ({
      ...meal,
      userId,
      date: isoDate(meal.createdAt),
      mealType: meal.name || "Öğün",
      foodGroup: "Karbonhidrat dengeli",
      portion: "1 porsiyon",
    })),
    progress: (legacy.progress || []).map((entry) => ({
      ...entry,
      userId,
      steps: 0,
      sleep: 0,
    })),
    waterLogs: [],
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCurrentUser() {
  if (state.session.type !== "user") {
    return null;
  }

  return state.users.find((user) => user.id === state.session.id) || null;
}

function isUserSession() {
  return Boolean(getCurrentUser());
}

function isAdminSession() {
  return state.session.type === "admin";
}

function getUserWorkouts() {
  const user = getCurrentUser();
  return user ? state.workouts.filter((workout) => workout.userId === user.id) : [];
}

function getUserMeals() {
  const user = getCurrentUser();
  return user ? state.meals.filter((meal) => meal.userId === user.id) : [];
}

function getUserProgress() {
  const user = getCurrentUser();
  return user ? state.progress.filter((entry) => entry.userId === user.id) : [];
}

function getUserWaterLogs() {
  const user = getCurrentUser();
  return user ? state.waterLogs.filter((entry) => entry.userId === user.id) : [];
}

function handleRegisterSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const email = String(formData.get("email")).trim().toLowerCase();

  if (state.users.some((user) => user.email === email)) {
    setMessage("Bu e-posta ile kayıtlı bir kullanıcı zaten var.", "error");
    return;
  }

  if (state.admins.some((admin) => admin.email === email)) {
    setMessage("Bu e-posta admin hesabı olarak ayrılmış durumda.", "error");
    return;
  }

  const user = {
    id: crypto.randomUUID(),
    fullName: String(formData.get("fullName")).trim(),
    email,
    password: String(formData.get("password")),
    createdAt: new Date().toISOString(),
    profile: {
      age: "",
      height: "",
      currentWeight: "",
    },
    targets: {
      goalType: "Formu korumak",
      targetWeight: "",
      dailyStepGoal: 10000,
      dailyWaterGoal: 2500,
      weeklyWorkoutGoal: 4,
    },
  };

  state.users.push(user);
  state.session = {
    type: "user",
    id: user.id,
  };
  saveState();
  event.currentTarget.reset();
  setMessage("Kullanıcı hesabı oluşturuldu ve oturum açıldı.", "success");
  renderAll();
}

function handleUserLoginSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const email = String(formData.get("email")).trim().toLowerCase();
  const password = String(formData.get("password"));
  const user = state.users.find((item) => item.email === email && item.password === password);

  if (!user) {
    setMessage("Kullanıcı giriş bilgileri hatalı.", "error");
    return;
  }

  state.session = {
    type: "user",
    id: user.id,
  };
  saveState();
  event.currentTarget.reset();
  setMessage(`Tekrar hoş geldin, ${user.fullName}.`, "success");
  renderAll();
}

function handleLogout() {
  if (!state.session.type) {
    setMessage("Şu anda açık bir oturum bulunmuyor.", "error");
    return;
  }

  state.session = {
    type: null,
    id: null,
  };
  saveState();
  setMessage("Oturum kapatıldı.", "success");
  renderAll();
}

function handleProfileSubmit(event) {
  event.preventDefault();
  const user = requireCurrentUser();
  if (!user) {
    return;
  }

  const formData = new FormData(event.currentTarget);
  user.fullName = String(formData.get("fullName")).trim();
  user.profile = {
    age: Number(formData.get("age")),
    height: Number(formData.get("height")),
    currentWeight: Number(formData.get("currentWeight")),
  };
  user.targets = {
    goalType: String(formData.get("goalType")),
    targetWeight: Number(formData.get("targetWeight")),
    dailyStepGoal: Number(formData.get("dailyStepGoal")),
    dailyWaterGoal: Number(formData.get("dailyWaterGoal")),
    weeklyWorkoutGoal: Number(formData.get("weeklyWorkoutGoal")),
  };

  saveState();
  setMessage("Profil ve hedef ayarları güncellendi.", "success");
  renderAll();
}

function handleWorkoutSubmit(event) {
  event.preventDefault();
  const user = requireCurrentUser();
  if (!user) {
    return;
  }

  const formData = new FormData(event.currentTarget);
  state.workouts.unshift({
    id: crypto.randomUUID(),
    userId: user.id,
    date: String(formData.get("date")),
    type: String(formData.get("type")),
    focus: String(formData.get("focus")),
    intensity: String(formData.get("intensity")),
    duration: Number(formData.get("duration")),
    caloriesBurned: Number(formData.get("caloriesBurned")),
    notes: String(formData.get("notes")).trim(),
    createdAt: new Date().toISOString(),
  });

  event.currentTarget.reset();
  seedFormDefaults();
  saveState();
  setMessage("Antrenman kaydedildi ve liste güncellendi.", "success");
  renderAll();
}

function handleMealSubmit(event) {
  event.preventDefault();
  const user = requireCurrentUser();
  if (!user) {
    return;
  }

  const formData = new FormData(event.currentTarget);
  state.meals.unshift({
    id: crypto.randomUUID(),
    userId: user.id,
    date: String(formData.get("date")),
    mealType: String(formData.get("mealType")),
    foodGroup: String(formData.get("foodGroup")),
    portion: String(formData.get("portion")).trim(),
    calories: Number(formData.get("calories")),
    protein: Number(formData.get("protein")),
    carbs: Number(formData.get("carbs")),
    fat: Number(formData.get("fat")),
    createdAt: new Date().toISOString(),
  });

  event.currentTarget.reset();
  seedFormDefaults();
  saveState();
  setMessage("Öğün kaydı eklendi. Günlük makro özeti güncellendi.", "success");
  renderAll();
}

function handleWaterSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  addWaterEntry(Number(formData.get("amount")));
  event.currentTarget.reset();
}

function handleWaterQuickAdd(event) {
  const button = event.target.closest("[data-amount]");
  if (!button) {
    return;
  }

  addWaterEntry(Number(button.dataset.amount));
}

function addWaterEntry(amount) {
  const user = requireCurrentUser();
  if (!user) {
    return;
  }

  state.waterLogs.unshift({
    id: crypto.randomUUID(),
    userId: user.id,
    amount,
    createdAt: new Date().toISOString(),
  });

  saveState();
  setMessage(`${amount} ml su eklendi.`, "success");
  renderAll();
}

function handleProgressSubmit(event) {
  event.preventDefault();
  const user = requireCurrentUser();
  if (!user) {
    return;
  }

  const formData = new FormData(event.currentTarget);
  const date = String(formData.get("date"));
  const existingEntry = state.progress.find((entry) => entry.userId === user.id && entry.date === date);
  const payload = {
    weight: Number(formData.get("weight")),
    bodyFat: Number(formData.get("bodyFat")),
    steps: Number(formData.get("steps")),
    sleep: Number(formData.get("sleep")),
  };

  if (existingEntry) {
    Object.assign(existingEntry, payload);
  } else {
    state.progress.push({
      id: crypto.randomUUID(),
      userId: user.id,
      date,
      ...payload,
    });
  }

  state.progress.sort((first, second) => first.date.localeCompare(second.date));
  saveState();
  setMessage("İlerleme verisi kaydedildi. Grafik güncellendi.", "success");
  renderAll();
}

function requireCurrentUser() {
  const user = getCurrentUser();
  if (!user) {
    setMessage("Bu işlemi yapmak için kullanıcı girişi yapman gerekiyor.", "error");
    return null;
  }

  return user;
}

function setMessage(message, tone) {
  messageBar.textContent = message;
  messageBar.className = `message-bar ${tone}`;
}

function renderAll() {
  renderSession();
  renderDashboard();
  renderGoals();
  renderWorkouts();
  renderMeals();
  renderWater();
  renderProgress();
  seedFormDefaults();
  syncFormAccess();
}

function renderSession() {
  const currentUser = getCurrentUser();
  const sessionStatus = document.querySelector("#sessionStatus");
  const sessionType = document.querySelector("#sessionType");
  const sessionRole = document.querySelector("#sessionRole");
  const profileCard = document.querySelector("#currentProfileCard");

  if (currentUser) {
    sessionStatus.textContent = currentUser.fullName;
    sessionType.textContent = "Kullanıcı";
    sessionRole.textContent = "Üye";
    logoutButton.classList.remove("hidden");
    profileCard.innerHTML = `
      <span class="status-dot"></span>
      <strong>${escapeHtml(currentUser.fullName)}</strong>
      <p>${escapeHtml(currentUser.email)} hesabı aktif. Hedeflerini ve günlük kayıtlarını yönetebilirsin.</p>
    `;
    return;
  }

  if (isAdminSession()) {
    sessionStatus.textContent = "Admin oturumu";
    sessionType.textContent = "Admin";
    sessionRole.textContent = "Ayrı panel";
    logoutButton.classList.remove("hidden");
    profileCard.innerHTML = `
      <span class="status-dot"></span>
      <strong>Admin oturumu ayrı sayfada aktif</strong>
      <p>Yönetim alanı <a href="./admin.html">admin panelinde</a> açık. Kullanıcı işlemleri için kullanıcı oturumu aç.</p>
    `;
    return;
  }

  sessionStatus.textContent = "Misafir";
  sessionType.textContent = "-";
  sessionRole.textContent = "-";
  logoutButton.classList.add("hidden");
  profileCard.innerHTML = `
    <span class="status-dot"></span>
    <strong>Henüz aktif kullanıcı yok</strong>
    <p>Kullanıcı girişi ile kişisel hedeflerini ve günlük kayıtlarını yönetebilirsin. Admin alanı ayrı sayfada açılır.</p>
  `;
}

function renderDashboard() {
  if (!isUserSession()) {
    document.querySelector("#dashboardSteps").textContent = "0";
    document.querySelector("#dashboardCalories").textContent = "0 kcal";
    document.querySelector("#dashboardWorkoutMinutes").textContent = "0 dk";
    document.querySelector("#dashboardWater").textContent = "0 ml";
    document.querySelector("#weeklyWorkoutCount").textContent = "0";
    document.querySelector("#weeklyMealCount").textContent = "0";
    document.querySelector("#weeklyWaterAverage").textContent = "0 ml";
    document.querySelector("#waterProgressBar").style.width = "0%";

    if (isAdminSession()) {
      document.querySelector("#stepsMeta").textContent = "Admin oturumu ayrı panelde açık";
      document.querySelector("#caloriesMeta").textContent = "Kullanıcı verileri kullanıcı hesabında görünür";
      document.querySelector("#workoutMeta").textContent = "Antrenman girişi kullanıcı oturumunda aktif olur";
      document.querySelector("#waterMeta").textContent = "Su takibi kullanıcı hesabına bağlı";
      document.querySelector("#focusMessage").textContent = "Admin paneli ayrı sayfada aktif. Kullanıcı işlemleri için kullanıcı girişi yap.";
    } else {
      document.querySelector("#stepsMeta").textContent = "Hedef için kullanıcı girişi yap";
      document.querySelector("#caloriesMeta").textContent = "Beslenme kayıtları için kullanıcı girişi yap";
      document.querySelector("#workoutMeta").textContent = "Antrenman paneli kullanıcı oturumuyla aktif olur";
      document.querySelector("#waterMeta").textContent = "Su hedefi kullanıcı hesabına bağlı";
      document.querySelector("#focusMessage").textContent = "Hedeflerini netleştirmek için önce kullanıcı girişi yap.";
    }
    return;
  }

  const user = getCurrentUser();
  const workouts = getUserWorkouts();
  const meals = getUserMeals();
  const progressEntries = getUserProgress();
  const waterLogs = getUserWaterLogs();
  const today = isoDate(new Date().toISOString());
  const todaysMeals = meals.filter((meal) => meal.date === today);
  const todaysWorkouts = workouts.filter((workout) => workout.date === today);
  const todaysWater = waterLogs.filter((log) => isoDate(log.createdAt) === today);
  const todaysProgress = progressEntries.find((entry) => entry.date === today);
  const calorieTotal = todaysMeals.reduce((total, meal) => total + meal.calories, 0);
  const workoutMinutes = todaysWorkouts.reduce((total, workout) => total + workout.duration, 0);
  const waterTotal = todaysWater.reduce((total, item) => total + item.amount, 0);
  const steps = todaysProgress?.steps || 0;
  const target = user.targets.dailyStepGoal;
  const waterGoal = user.targets.dailyWaterGoal;
  const weeklyWorkouts = countItemsWithinLastDays(workouts, "date", 7);
  const weeklyMeals = countItemsWithinLastDays(meals, "date", 7);
  const weeklyWaterAverage = calculateAverageWater(waterLogs);
  const waterCompletion = waterGoal ? Math.min((waterTotal / waterGoal) * 100, 100) : 0;

  document.querySelector("#dashboardSteps").textContent = formatNumber(steps);
  document.querySelector("#dashboardCalories").textContent = `${formatNumber(calorieTotal)} kcal`;
  document.querySelector("#dashboardWorkoutMinutes").textContent = `${formatNumber(workoutMinutes)} dk`;
  document.querySelector("#dashboardWater").textContent = `${formatNumber(waterTotal)} ml`;
  document.querySelector("#stepsMeta").textContent = `${formatNumber(target)} adım hedefine ${formatNumber(Math.max(target - steps, 0))} adım kaldı`;
  document.querySelector("#caloriesMeta").textContent = `${todaysMeals.length} öğün kaydı işlendi`;
  document.querySelector("#workoutMeta").textContent = `${todaysWorkouts.length} antrenman oturumu eklendi`;
  document.querySelector("#waterMeta").textContent = `${formatNumber(waterGoal)} ml hedefin %${Math.round(waterCompletion)} tamamlandı`;
  document.querySelector("#focusMessage").textContent = buildFocusMessage({
    user,
    calorieTotal,
    workoutMinutes,
    waterTotal,
    steps,
  });
  document.querySelector("#waterProgressBar").style.width = `${waterCompletion}%`;
  document.querySelector("#weeklyWorkoutCount").textContent = formatNumber(weeklyWorkouts);
  document.querySelector("#weeklyMealCount").textContent = formatNumber(weeklyMeals);
  document.querySelector("#weeklyWaterAverage").textContent = `${formatNumber(weeklyWaterAverage)} ml`;
}

function buildFocusMessage({ user, calorieTotal, workoutMinutes, waterTotal, steps }) {
  if (!user.profile.currentWeight) {
    return "Profil ölçülerini kaydedip hedef kartlarını doldurarak daha net bir plan kur.";
  }

  if (!workoutMinutes) {
    return `${user.targets.goalType} hedefi için bugün ilk antrenmanını ekleme zamanı.`;
  }

  return `Bugün ${formatNumber(steps)} adım, ${formatNumber(calorieTotal)} kcal, ${formatNumber(workoutMinutes)} dk antrenman ve ${formatNumber(waterTotal)} ml su kaydın var.`;
}

function renderGoals() {
  const goalList = document.querySelector("#goalList");
  const targetHighlights = document.querySelector("#targetHighlights");
  const user = getCurrentUser();

  if (!user) {
    goalList.className = "goal-grid empty-state";
    goalList.textContent = isAdminSession()
      ? "Admin oturumu ayrı sayfada açık. Bu alan kullanıcı hesabı içindir."
      : "Hedeflerini yönetmek için kullanıcı girişi yap.";
    targetHighlights.className = "goal-grid empty-state";
    targetHighlights.textContent = isAdminSession()
      ? "Admin alanı ayrı sayfada çalışır."
      : "Kullanıcı girişi yaptıktan sonra hedef kartları burada görünür.";
    profileForm.reset();
    return;
  }

  profileForm.elements.namedItem("fullName").value = user.fullName || "";
  profileForm.elements.namedItem("age").value = user.profile.age || "";
  profileForm.elements.namedItem("height").value = user.profile.height || "";
  profileForm.elements.namedItem("currentWeight").value = user.profile.currentWeight || "";
  profileForm.elements.namedItem("goalType").value = user.targets.goalType || "Formu korumak";
  profileForm.elements.namedItem("targetWeight").value = user.targets.targetWeight || "";
  profileForm.elements.namedItem("dailyStepGoal").value = user.targets.dailyStepGoal || "";
  profileForm.elements.namedItem("dailyWaterGoal").value = user.targets.dailyWaterGoal || "";
  profileForm.elements.namedItem("weeklyWorkoutGoal").value = user.targets.weeklyWorkoutGoal || "";

  const weightGap = user.targets.targetWeight
    ? Math.abs(Number(user.profile.currentWeight || 0) - Number(user.targets.targetWeight)).toFixed(1)
    : "-";

  goalList.className = "goal-grid";
  goalList.innerHTML = `
    <article class="goal-chip">
      <span>Ana hedef</span>
      <strong>${escapeHtml(user.targets.goalType)}</strong>
      <span>Hedef kilo: ${formatMetric(user.targets.targetWeight, "kg")}</span>
    </article>
    <article class="goal-chip">
      <span>Adım hedefi</span>
      <strong>${formatNumber(user.targets.dailyStepGoal)}</strong>
      <span>Günlük aktif yaşam takibi</span>
    </article>
    <article class="goal-chip">
      <span>Su hedefi</span>
      <strong>${formatMetric(user.targets.dailyWaterGoal, "ml")}</strong>
      <span>Hidratasyon kontrolü</span>
    </article>
    <article class="goal-chip">
      <span>Haftalık plan</span>
      <strong>${formatMetric(user.targets.weeklyWorkoutGoal, "antrenman")}</strong>
      <span>Mevcut kilo farkı: ${weightGap === "-" ? "-" : `${weightGap} kg`}</span>
    </article>
  `;

  targetHighlights.className = "goal-grid";
  targetHighlights.innerHTML = `
    <article class="goal-chip">
      <span>Profil</span>
      <strong>${escapeHtml(user.fullName)}</strong>
      <span>${formatMetric(user.profile.height, "cm")} • ${formatMetric(user.profile.currentWeight, "kg")}</span>
    </article>
    <article class="goal-chip">
      <span>Odak</span>
      <strong>${escapeHtml(user.targets.goalType)}</strong>
      <span>Yaş: ${formatMetric(user.profile.age, "")}</span>
    </article>
    <article class="goal-chip">
      <span>Su Planı</span>
      <strong>${formatMetric(user.targets.dailyWaterGoal, "ml")}</strong>
      <span>Her öğünde su eklemeyi unutma</span>
    </article>
    <article class="goal-chip">
      <span>Antrenman Hedefi</span>
      <strong>${formatMetric(user.targets.weeklyWorkoutGoal, "seans")}</strong>
      <span>Haftalık sürdürülebilir plan</span>
    </article>
  `;
}

function renderWorkouts() {
  const workoutList = document.querySelector("#workoutList");
  const workouts = getUserWorkouts();

  if (!isUserSession()) {
    workoutList.className = "stack-list empty-state";
    workoutList.textContent = isAdminSession()
      ? "Admin oturumu ayrı sayfada açık. Bu alan kullanıcı içindir."
      : "Antrenman eklemek için kullanıcı girişi yap.";
    return;
  }

  if (!workouts.length) {
    workoutList.className = "stack-list empty-state";
    workoutList.textContent = "Henüz antrenman eklenmedi.";
    return;
  }

  workoutList.className = "stack-list";
  workoutList.innerHTML = workouts
    .slice(0, 6)
    .map(
      (workout) => `
        <article class="list-item">
          <div>
            <strong>${escapeHtml(workout.type)} • ${escapeHtml(workout.focus)}</strong>
            <div class="item-meta">${formatDate(workout.date)} • ${escapeHtml(workout.intensity)} yoğunluk</div>
            <div class="item-meta">${escapeHtml(workout.notes || "Ek not girilmedi.")}</div>
          </div>
          <div class="item-meta">${formatMetric(workout.duration, "dk")} • ${formatMetric(workout.caloriesBurned, "kcal")}</div>
        </article>
      `,
    )
    .join("");
}

function renderMeals() {
  const mealList = document.querySelector("#mealList");
  const meals = getUserMeals();

  if (!isUserSession()) {
    mealList.className = "stack-list empty-state";
    mealList.textContent = isAdminSession()
      ? "Admin oturumu ayrı sayfada açık. Bu alan kullanıcı içindir."
      : "Beslenme kayıtları için kullanıcı girişi yap.";
    setNutritionSummary({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    return;
  }

  const today = isoDate(new Date().toISOString());
  const todaysMeals = meals.filter((meal) => meal.date === today);
  const summary = todaysMeals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      protein: totals.protein + meal.protein,
      carbs: totals.carbs + meal.carbs,
      fat: totals.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  setNutritionSummary(summary);

  if (!meals.length) {
    mealList.className = "stack-list empty-state";
    mealList.textContent = "Henüz öğün eklenmedi.";
    return;
  }

  mealList.className = "stack-list";
  mealList.innerHTML = meals
    .slice(0, 6)
    .map(
      (meal) => `
        <article class="list-item">
          <div>
            <strong>${escapeHtml(meal.mealType)} • ${escapeHtml(meal.foodGroup)}</strong>
            <div class="item-meta">${formatDate(meal.date)} • ${escapeHtml(meal.portion)}</div>
          </div>
          <div class="item-meta">${meal.calories} kcal • P ${meal.protein} / K ${meal.carbs} / Y ${meal.fat}</div>
        </article>
      `,
    )
    .join("");
}

function setNutritionSummary(summary) {
  document.querySelector("#summaryCalories").textContent = `${formatNumber(summary.calories)} kcal`;
  document.querySelector("#summaryProtein").textContent = `${formatNumber(summary.protein)} g`;
  document.querySelector("#summaryCarbs").textContent = `${formatNumber(summary.carbs)} g`;
  document.querySelector("#summaryFat").textContent = `${formatNumber(summary.fat)} g`;
}

function renderWater() {
  const waterHistory = document.querySelector("#waterHistory");
  const waterToday = document.querySelector("#waterToday");
  const waterGoalText = document.querySelector("#waterGoalText");
  const user = getCurrentUser();

  if (!user) {
    waterToday.textContent = "0 ml";
    waterGoalText.textContent = "0 ml";
    waterHistory.className = "stack-list empty-state";
    waterHistory.textContent = isAdminSession()
      ? "Admin oturumu ayrı sayfada açık. Bu alan kullanıcı içindir."
      : "Su takibini kullanmak için kullanıcı girişi yap.";
    return;
  }

  const today = isoDate(new Date().toISOString());
  const todaysLogs = getUserWaterLogs().filter((entry) => isoDate(entry.createdAt) === today);
  const total = todaysLogs.reduce((sum, entry) => sum + entry.amount, 0);

  waterToday.textContent = `${formatNumber(total)} ml`;
  waterGoalText.textContent = `${formatNumber(user.targets.dailyWaterGoal)} ml`;

  if (!todaysLogs.length) {
    waterHistory.className = "stack-list empty-state";
    waterHistory.textContent = "Bugün henüz su eklenmedi.";
    return;
  }

  waterHistory.className = "stack-list";
  waterHistory.innerHTML = todaysLogs
    .slice(0, 6)
    .map(
      (entry) => `
        <article class="list-item">
          <div>
            <strong>${formatMetric(entry.amount, "ml")} su eklendi</strong>
            <div class="item-meta">${formatDateTime(entry.createdAt)}</div>
          </div>
          <div class="item-meta">Günlük takibe işlendi</div>
        </article>
      `,
    )
    .join("");
}

function renderProgress() {
  const progressList = document.querySelector("#progressList");
  const entries = getUserProgress();

  if (!isUserSession()) {
    progressList.className = "stack-list empty-state";
    progressList.textContent = isAdminSession()
      ? "Admin oturumu ayrı sayfada açık. Bu alan kullanıcı içindir."
      : "Grafik için kullanıcı girişi yap.";
    renderEmptyChart(
      isAdminSession()
        ? "Admin paneli ayrı sayfada. Bu grafik kullanıcı oturumunda görünür."
        : "Grafiği görmek için kullanıcı girişi yap ve haftalık veri ekle.",
    );
    return;
  }

  if (!entries.length) {
    progressList.className = "stack-list empty-state";
    progressList.textContent = "Henüz ilerleme verisi eklenmedi.";
    renderEmptyChart("Haftalık grafik için ilk ilerleme kaydını ekle.");
    return;
  }

  progressList.className = "stack-list";
  progressList.innerHTML = [...entries]
    .reverse()
    .slice(0, 7)
    .map(
      (entry) => `
        <article class="list-item">
          <div>
            <strong>${formatDate(entry.date)}</strong>
            <div class="item-meta">Yağ oranı: %${entry.bodyFat} • Uyku: ${entry.sleep} saat</div>
          </div>
          <div class="item-meta">${entry.weight} kg • ${formatNumber(entry.steps)} adım</div>
        </article>
      `,
    )
    .join("");

  renderChart(entries.slice(-7));
}

function renderChart(entries) {
  const chart = document.querySelector("#progressChart");
  const width = 760;
  const height = 300;
  const paddingX = 60;
  const paddingTop = 28;
  const paddingBottom = 48;
  const chartHeight = height - paddingTop - paddingBottom;
  const weights = entries.map((entry) => entry.weight);
  const steps = entries.map((entry) => entry.steps);
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const weightRange = Math.max(maxWeight - minWeight, 1);
  const maxSteps = Math.max(...steps, 1000);

  const points = entries.map((entry, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / Math.max(entries.length - 1, 1);
    const y = paddingTop + chartHeight - ((entry.weight - minWeight) / weightRange) * chartHeight;
    const barHeight = (entry.steps / maxSteps) * (chartHeight - 14);

    return {
      x,
      y,
      barHeight,
      date: entry.date,
      weight: entry.weight,
      steps: entry.steps,
    };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const bars = points
    .map(
      (point) => `
        <rect
          x="${point.x - 18}"
          y="${paddingTop + chartHeight - point.barHeight}"
          width="36"
          height="${point.barHeight}"
          rx="12"
          fill="rgba(37, 99, 235, 0.14)"
        />
      `,
    )
    .join("");
  const labels = points
    .map(
      (point) => `
        <g>
          <circle cx="${point.x}" cy="${point.y}" r="6" fill="#f97316" />
          <text x="${point.x}" y="${point.y - 14}" text-anchor="middle" font-size="11" fill="#111827">${point.weight} kg</text>
          <text x="${point.x}" y="${height - 18}" text-anchor="middle" font-size="11" fill="#5b6475">${formatShortDate(point.date)}</text>
          <text x="${point.x}" y="${paddingTop + chartHeight - point.barHeight - 8}" text-anchor="middle" font-size="11" fill="#2563eb">${formatNumber(point.steps)}</text>
        </g>
      `,
    )
    .join("");

  chart.innerHTML = `
    <rect width="${width}" height="${height}" rx="24" fill="#ffffff" />
    <text x="${paddingX}" y="22" font-size="13" fill="#5b6475">Adım çubukları + kilo çizgisi</text>
    <line x1="${paddingX}" y1="${paddingTop + chartHeight}" x2="${width - paddingX}" y2="${paddingTop + chartHeight}" stroke="rgba(17,24,39,0.12)" />
    <line x1="${paddingX}" y1="${paddingTop}" x2="${paddingX}" y2="${paddingTop + chartHeight}" stroke="rgba(17,24,39,0.12)" />
    ${bars}
    <polyline fill="none" stroke="#f97316" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${polyline}" />
    ${labels}
  `;
}

function renderEmptyChart(message) {
  const chart = document.querySelector("#progressChart");
  chart.innerHTML = `
    <rect width="760" height="300" rx="24" fill="#ffffff" />
    <text x="380" y="150" text-anchor="middle" font-size="18" fill="#5b6475">${escapeHtml(message)}</text>
  `;
}

function syncFormAccess() {
  const loggedInAsUser = isUserSession();
  const forms = [profileForm, workoutForm, mealForm, waterForm, progressForm];

  forms.forEach((form) => {
    [...form.elements].forEach((element) => {
      element.disabled = !loggedInAsUser;
    });
  });

  [...waterQuickActions.querySelectorAll("button")].forEach((button) => {
    button.disabled = !loggedInAsUser;
  });
}

function seedFormDefaults() {
  const today = isoDate(new Date().toISOString());
  if (!workoutForm.date.value) {
    workoutForm.date.value = today;
  }
  if (!mealForm.date.value) {
    mealForm.date.value = today;
  }
  if (!progressForm.date.value) {
    progressForm.date.value = today;
  }
}

function countItemsWithinLastDays(items, key, days) {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return items.filter((item) => new Date(item[key]).getTime() >= start.getTime()).length;
}

function calculateAverageWater(logs) {
  if (!logs.length) {
    return 0;
  }

  const grouped = logs.reduce((map, entry) => {
    const day = isoDate(entry.createdAt);
    map.set(day, (map.get(day) || 0) + entry.amount);
    return map;
  }, new Map());

  const total = [...grouped.values()].reduce((sum, value) => sum + value, 0);
  return Math.round(total / grouped.size);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(dateString));
}

function formatDateTime(dateString) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function formatShortDate(dateString) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(dateString));
}

function isoDate(dateString) {
  return new Date(dateString).toISOString().split("T")[0];
}

function formatMetric(value, unit) {
  if (value === "" || value === null || value === undefined) {
    return "-";
  }

  return `${formatNumber(value)}${unit ? ` ${unit}` : ""}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("tr-TR").format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
