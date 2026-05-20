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

const adminLoginForm = document.querySelector("#adminLoginForm");
const adminLogoutButton = document.querySelector("#adminLogoutButton");
const adminMessageBar = document.querySelector("#adminMessageBar");
const adminPanel = document.querySelector("#adminPanel");

adminLoginForm.addEventListener("submit", handleAdminLoginSubmit);
adminLogoutButton.addEventListener("click", handleLogout);

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
  return normalizeState({
    admins: [DEFAULT_ADMIN],
    users: previous.users || [],
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
    session: { type: null, id: null },
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

function getCurrentAdmin() {
  if (state.session.type !== "admin") {
    return null;
  }

  return state.admins.find((admin) => admin.id === state.session.id) || null;
}

function handleAdminLoginSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const email = String(formData.get("email")).trim().toLowerCase();
  const password = String(formData.get("password"));
  const admin = state.admins.find((item) => item.email === email && item.password === password);

  if (!admin) {
    setMessage("Admin giriş bilgileri hatalı.", "error");
    return;
  }

  state.session = {
    type: "admin",
    id: admin.id,
  };
  saveState();
  event.currentTarget.reset();
  setMessage(`Admin oturumu açıldı. Hoş geldin, ${admin.name}.`, "success");
  renderAll();
}

function handleLogout() {
  state.session = {
    type: null,
    id: null,
  };
  saveState();
  setMessage("Admin oturumu kapatıldı.", "success");
  renderAll();
}

function setMessage(message, tone) {
  adminMessageBar.textContent = message;
  adminMessageBar.className = `message-bar ${tone}`;
}

function renderAll() {
  renderSession();
  renderAdminPanel();
}

function renderSession() {
  const admin = getCurrentAdmin();
  const adminSessionStatus = document.querySelector("#adminSessionStatus");
  const adminProfileCard = document.querySelector("#adminProfileCard");

  if (!admin) {
    adminSessionStatus.textContent = "Kapalı";
    adminLogoutButton.classList.add("hidden");
    adminProfileCard.innerHTML = `
      <span class="status-dot"></span>
      <strong>Admin oturumu kapalı</strong>
      <p>Giriş yaptıktan sonra tüm kullanıcı sayıları, antrenmanlar, öğünler ve son aktiviteler burada görünür olacak.</p>
    `;
    return;
  }

  adminSessionStatus.textContent = admin.name;
  adminLogoutButton.classList.remove("hidden");
  adminProfileCard.innerHTML = `
    <span class="status-dot"></span>
    <strong>${escapeHtml(admin.name)}</strong>
    <p>${escapeHtml(admin.email)} hesabı ile yönetim paneli aktif. Kullanıcı verilerini buradan özet olarak görebilirsin.</p>
  `;
}

function renderAdminPanel() {
  const admin = getCurrentAdmin();
  if (!admin) {
    adminPanel.classList.add("hidden");
    return;
  }

  adminPanel.classList.remove("hidden");
  document.querySelector("#adminUserCount").textContent = formatNumber(state.users.length);
  document.querySelector("#adminWorkoutCount").textContent = formatNumber(state.workouts.length);
  document.querySelector("#adminMealCount").textContent = formatNumber(state.meals.length);
  document.querySelector("#adminWaterCount").textContent = formatNumber(state.waterLogs.length);

  const userList = document.querySelector("#userList");
  const recentActivity = document.querySelector("#recentActivity");

  if (!state.users.length) {
    userList.className = "stack-list empty-state";
    userList.textContent = "Henüz kullanıcı bulunmuyor.";
  } else {
    userList.className = "stack-list";
    userList.innerHTML = state.users
      .map((user) => {
        const workoutCount = state.workouts.filter((item) => item.userId === user.id).length;
        const mealCount = state.meals.filter((item) => item.userId === user.id).length;
        return `
          <article class="list-item">
            <div>
              <strong>${escapeHtml(user.fullName)}</strong>
              <div class="item-meta">${escapeHtml(user.email)}</div>
            </div>
            <div class="item-meta">${workoutCount} antrenman • ${mealCount} öğün</div>
          </article>
        `;
      })
      .join("");
  }

  const allActivities = [
    ...state.workouts.map((workout) => ({
      label: `${findUserName(workout.userId)} bir antrenman ekledi`,
      detail: `${workout.type} • ${workout.duration} dk`,
      date: workout.createdAt,
    })),
    ...state.meals.map((meal) => ({
      label: `${findUserName(meal.userId)} bir öğün kaydetti`,
      detail: `${meal.mealType} • ${meal.calories} kcal`,
      date: meal.createdAt,
    })),
    ...state.waterLogs.map((water) => ({
      label: `${findUserName(water.userId)} su takibi yaptı`,
      detail: `${water.amount} ml`,
      date: water.createdAt,
    })),
  ].sort((first, second) => new Date(second.date) - new Date(first.date));

  if (!allActivities.length) {
    recentActivity.className = "stack-list empty-state";
    recentActivity.textContent = "Henüz aktivite bulunmuyor.";
    return;
  }

  recentActivity.className = "stack-list";
  recentActivity.innerHTML = allActivities
    .slice(0, 8)
    .map(
      (activity) => `
        <article class="list-item">
          <div>
            <strong>${escapeHtml(activity.label)}</strong>
            <div class="item-meta">${escapeHtml(activity.detail)}</div>
          </div>
          <div class="item-meta">${formatDateTime(activity.date)}</div>
        </article>
      `,
    )
    .join("");
}

function findUserName(userId) {
  return state.users.find((user) => user.id === userId)?.fullName || "Bilinmeyen kullanıcı";
}

function isoDate(dateString) {
  return new Date(dateString).toISOString().split("T")[0];
}

function formatDateTime(dateString) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
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
