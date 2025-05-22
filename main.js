// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBiwqdNtj8p9MtQb5LfeqUZ5aHiaChaYzE",
  authDomain: "anonymous-chat-c7bfd.firebaseapp.com",
  databaseURL: "https://anonymous-chat-c7bfd-default-rtdb.firebaseio.com",
  projectId: "anonymous-chat-c7bfd",
  storageBucket: "anonymous-chat-c7bfd.appspot.com",
  messagingSenderId: "961386618213",
  appId: "1:961386618213:web:d2e87e88c92ff23485d58c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// DOM Elements
const elements = {
  // Screens
  loadingScreen: document.getElementById('loadingScreen'),
  welcomeScreen: document.getElementById('welcomeScreen'),
  nameScreen: document.getElementById('nameScreen'),
  genderScreen: document.getElementById('genderScreen'),
  searchingScreen: document.getElementById('searchingScreen'),
  chatInterface: document.getElementById('chatInterface'),
  
  // Inputs
  nameInput: document.getElementById('nameInput'),
  messageInput: document.getElementById('messageInput'),
  
  // Buttons
  getStartedBtn: document.getElementById('getStartedBtn'),
  nameNextBtn: document.getElementById('nameNextBtn'),
  backToNameBtn: document.getElementById('backToNameBtn'),
  startChatBtn: document.getElementById('startChatBtn'),
  cancelSearchBtn: document.getElementById('cancelSearchBtn'),
  sendBtn: document.getElementById('sendBtn'),
  nextPartnerBtn: document.getElementById('nextPartnerBtn'),
  startChattingBtn: document.getElementById('startChattingBtn'),
  findNewPartnerBtn: document.getElementById('findNewPartnerBtn'),
  tryAgainBtn: document.getElementById('tryAgainBtn'),
  changePrefsBtn: document.getElementById('changePrefsBtn'),
  
  // Modals
  modalOverlay: document.getElementById('modalOverlay'),
  connectionSuccessModal: document.getElementById('connectionSuccessModal'),
  partnerSkippedModal: document.getElementById('partnerSkippedModal'),
  noPartnersModal: document.getElementById('noPartnersModal'),
  
  // Chat Elements
  chatMessages: document.getElementById('chatMessages'),
  partnerName: document.getElementById('partnerName'),
  skippedUserName: document.getElementById('skippedUserName'),
  connectedPartnerName: document.getElementById('connectedPartnerName'),
  typingIndicator: document.getElementById('typingIndicator'),
  connectionStatus: document.querySelector('.connection-status'),
  statusDot: document.querySelector('.status-dot'),
  statusText: document.querySelector('.status-text'),
  
  // Timer
  countdown: document.getElementById('countdown'),
  timerProgress: document.getElementById('timerProgress'),
  
  // Theme Toggle
  darkToggle: document.getElementById('darkToggle'),
  
  // Gender Cards
  genderCards: document.querySelectorAll('.gender-card')
};

// App State
const state = {
  userName: '',
  userGender: '',
  roomId: null,
  partnerId: null,
  currentUserRef: null,
  countdownInterval: null,
  typingTimeout: null,
  partnerName: 'Anonymous',
  theme: localStorage.getItem('theme') || 'dark',
  connectionStatus: 'disconnected'
};

// Initialize App
function initApp() {
  // Set initial theme
  document.documentElement.setAttribute('data-theme', state.theme);
  elements.darkToggle.innerHTML = state.theme === 'dark' 
    ? '<i class="fas fa-sun"></i>' 
    : '<i class="fas fa-moon"></i>';
  
  // Show loading screen first
  setTimeout(() => {
    elements.loadingScreen.style.opacity = '0';
    setTimeout(() => {
      elements.loadingScreen.classList.add('hidden');
      showScreen('welcomeScreen');
    }, 300);
  }, 1500);
  
  // Event Listeners
  setupEventListeners();
  
  // Update connection status
  updateConnectionStatus('connecting');
}

// Screen Management
function showScreen(screenId) {
  document.querySelectorAll('.onboarding-screen').forEach(screen => {
    screen.classList.remove('active');
  });
  elements[screenId].classList.add('active');
}

// Event Listeners Setup
function setupEventListeners() {
  // Navigation
  elements.getStartedBtn.addEventListener('click', () => showScreen('nameScreen'));
  elements.nameNextBtn.addEventListener('click', validateName);
  elements.backToNameBtn.addEventListener('click', () => showScreen('nameScreen'));
  
  // Gender Selection
  elements.genderCards.forEach(card => {
    card.addEventListener('click', () => {
      elements.genderCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.userGender = card.dataset.gender;
      elements.startChatBtn.disabled = false;
    });
  });
  
  // Start Chat
  elements.startChatBtn.addEventListener('click', startChat);
  
  // Chat Functionality
  elements.sendBtn.addEventListener('click', sendMessage);
  elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  elements.messageInput.addEventListener('input', handleTyping);
  
  // Partner Management
  elements.nextPartnerBtn.addEventListener('click', skipPartner);
  elements.cancelSearchBtn.addEventListener('click', cancelSearch);
  elements.startChattingBtn.addEventListener('click', () => {
    elements.connectionSuccessModal.classList.remove('active');
    elements.modalOverlay.classList.remove('active');
  });
  elements.findNewPartnerBtn.addEventListener('click', findNewPartner);
  elements.tryAgainBtn.addEventListener('click', tryAgain);
  elements.changePrefsBtn.addEventListener('click', changePreferences);
  
  // Theme Toggle
  elements.darkToggle.addEventListener('click', toggleTheme);
}

// Validate Name Input
function validateName() {
  state.userName = elements.nameInput.value.trim();
  if (!state.userName) {
    alert('Please enter your name');
    return;
  }
  showScreen('genderScreen');
}

// Start Chat Process
function startChat() {
  if (!state.userName || !state.userGender) {
    alert('Please complete all fields');
    return;
  }
  
  showScreen('searchingScreen');
  startSearchTimer();
  findPartner();
}

// Start Search Timer
function startSearchTimer() {
  let timeLeft = 60;
  elements.countdown.textContent = '01:00';
  elements.timerProgress.style.animation = 'none';
  void elements.timerProgress.offsetWidth; // Trigger reflow
  elements.timerProgress.style.animation = 'timerProgress 60s linear forwards';
  
  state.countdownInterval = setInterval(() => {
    timeLeft--;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    elements.countdown.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 0) {
      clearInterval(state.countdownInterval);
      if (!state.roomId) {
        showNoPartnersModal();
      }
    }
  }, 1000);
}

// Find Partner
function findPartner() {
  const oppositeGender = state.userGender === 'male' ? 'female' : 'male';
  const waitingRef = db.ref(`waiting/${oppositeGender}`);
  
  // Create a reference for the current user
  state.currentUserRef = db.ref('users').push();
  
  // Add user to waiting list
  db.ref(`waiting/${state.userGender}/${state.currentUserRef.key}`).set(true);
  db.ref(`users/${state.currentUserRef.key}`).set({
    name: state.userName,
    gender: state.userGender
  });
  
  // Check for available partners
  waitingRef.once('value', (snapshot) => {
    const waitingUsers = snapshot.val();
    
    if (waitingUsers) {
      const partnerKey = Object.keys(waitingUsers)[0];
      state.partnerId = partnerKey;
      state.roomId = `room_${Date.now()}`;
      
      // Create chat room
      db.ref(`rooms/${state.roomId}`).set({
        messages: [],
        participants: {
          [state.currentUserRef.key]: state.userName,
          [partnerKey]: 'Anonymous'
        }
      });
      
      // Notify partner
      db.ref(`users/${partnerKey}`).update({
        roomId: state.roomId
      });
      
      // Start messaging
      startMessaging(state.roomId);
      
      // Remove from waiting lists
      db.ref(`waiting/${oppositeGender}/${partnerKey}`).remove();
      db.ref(`waiting/${state.userGender}/${state.currentUserRef.key}`).remove();
    } else {
      // Listen for room assignment
      const roomRef = db.ref(`users/${state.currentUserRef.key}/roomId`);
      roomRef.on('value', (snap) => {
        if (snap.exists()) {
          state.roomId = snap.val();
          clearInterval(state.countdownInterval);
          startMessaging(state.roomId);
          db.ref(`waiting/${state.userGender}/${state.currentUserRef.key}`).remove();
          roomRef.off(); // Stop listening
        }
      });
    }
  });
}

// Start Messaging
function startMessaging(roomId) {
  clearInterval(state.countdownInterval);
  elements.searchingScreen.classList.remove('active');
  
  // Get partner info
  db.ref(`rooms/${roomId}/participants`).once('value', (snap) => {
    const participants = snap.val();
    for (const [id, name] of Object.entries(participants)) {
      if (id !== state.currentUserRef.key) {
        state.partnerName = name;
        elements.partnerName.textContent = name;
        elements.connectedPartnerName.textContent = name;
      }
    }
  });
  
  // Show success modal
  showModal(elements.connectionSuccessModal);
  
  // Listen for messages
  db.ref(`rooms/${roomId}/messages`).on('child_added', (snap) => {
    const msg = snap.val();
    appendMessage(msg.sender === state.currentUserRef.key ? 'sent' : 'received', msg.text, msg.timestamp);
  });
  
  // Listen for typing indicator
  db.ref(`rooms/${roomId}/typing`).on('value', (snap) => {
    const typingUser = snap.val();
    if (typingUser && typingUser !== state.userName) {
      showTypingIndicator();
    } else {
      hideTypingIndicator();
    }
  });
  
  // Listen for partner skip
  db.ref(`rooms/${roomId}/skipped`).on('value', (snap) => {
    if (snap.exists()) {
      showSkippedModal(snap.val());
      cleanupChat();
    }
  });
  
  // Update connection status
  updateConnectionStatus('connected');
}

// Append Message to Chat
function appendMessage(type, text, timestamp) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', type);
  
  const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  messageDiv.innerHTML = `
    <div class="message-content">${text}</div>
    <div class="message-time">${time}</div>
  `;
  
  elements.chatMessages.appendChild(messageDiv);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// Send Message
function sendMessage() {
  const text = elements.messageInput.value.trim();
  if (!text || !state.roomId) return;
  
  const message = {
    text: text,
    sender: state.currentUserRef.key,
    timestamp: Date.now()
  };
  
  db.ref(`rooms/${state.roomId}/messages`).push(message);
  elements.messageInput.value = '';
  
  // Clear typing indicator
  db.ref(`rooms/${state.roomId}/typing`).set(null);
}

// Handle Typing Indicator
function handleTyping() {
  if (!state.roomId) return;
  
  // Set typing indicator
  db.ref(`rooms/${state.roomId}/typing`).set(state.userName);
  
  // Clear previous timeout
  clearTimeout(state.typingTimeout);
  
  // Set timeout to clear typing indicator
  state.typingTimeout = setTimeout(() => {
    db.ref(`rooms/${state.roomId}/typing`).set(null);
  }, 1000);
}

// Show Typing Indicator
function showTypingIndicator() {
  elements.typingIndicator.style.display = 'flex';
}

// Hide Typing Indicator
function hideTypingIndicator() {
  elements.typingIndicator.style.display = 'none';
}

// Skip Partner
function skipPartner() {
  if (!state.roomId) return;
  
  // Notify partner
  db.ref(`rooms/${state.roomId}/skipped`).set(state.userName);
  
  // Cleanup
  cleanupChat();
  
  // Show searching screen again
  showScreen('searchingScreen');
  startSearchTimer();
  findPartner();
}

// Find New Partner
function findNewPartner() {
  hideModal(elements.partnerSkippedModal);
  showScreen('searchingScreen');
  startSearchTimer();
  findPartner();
}

// Show Skipped Modal
function showSkippedModal(userName) {
  elements.skippedUserName.textContent = userName;
  showModal(elements.partnerSkippedModal);
}

// Show No Partners Modal
function showNoPartnersModal() {
  showModal(elements.noPartnersModal);
}

// Try Again
function tryAgain() {
  hideModal(elements.noPartnersModal);
  showScreen('searchingScreen');
  startSearchTimer();
  findPartner();
}

// Change Preferences
function changePreferences() {
  hideModal(elements.noPartnersModal);
  showScreen('genderScreen');
}

// Cancel Search
function cancelSearch() {
  clearInterval(state.countdownInterval);
  cleanupWaitingUser();
  showScreen('genderScreen');
}

// Cleanup Waiting User
function cleanupWaitingUser() {
  if (state.currentUserRef) {
    db.ref(`waiting/${state.userGender}/${state.currentUserRef.key}`).remove();
    db.ref(`users/${state.currentUserRef.key}`).remove();
  }
}

// Cleanup Chat
function cleanupChat() {
  if (state.roomId) {
    db.ref(`rooms/${state.roomId}`).remove();
    state.roomId = null;
  }
  updateConnectionStatus('disconnected');
}

// Show Modal
function showModal(modal) {
  elements.modalOverlay.classList.add('active');
  modal.classList.add('active');
}

// Hide Modal
function hideModal(modal) {
  elements.modalOverlay.classList.remove('active');
  modal.classList.remove('active');
}

// Toggle Theme
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('theme', state.theme);
  
  elements.darkToggle.innerHTML = state.theme === 'dark' 
    ? '<i class="fas fa-sun"></i>' 
    : '<i class="fas fa-moon"></i>';
}

// Update Connection Status
function updateConnectionStatus(status) {
  state.connectionStatus = status;
  elements.statusDot.className = 'status-dot ' + status;
  elements.statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
}

// Initialize the app when the window loads
window.addEventListener('load', initApp);

// Cleanup on window close
window.addEventListener('beforeunload', () => {
  cleanupWaitingUser();
  cleanupChat();
});