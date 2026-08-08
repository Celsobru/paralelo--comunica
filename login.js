const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const toggleAdmin = document.getElementById('toggle-admin');
const toggleClient = document.getElementById('toggle-client');
const showForgot = document.getElementById('show-forgot');
const backToLogin = document.getElementById('back-to-login');
const forgotSection = document.getElementById('forgot-section');
const btnSendReset = document.getElementById('btn-send-reset');
const resetMessage = document.getElementById('reset-message');
const resetEmail = document.getElementById('reset-email');

let loginType = 'admin';

toggleAdmin.addEventListener('click', () => {
  loginType = 'admin';
  toggleAdmin.classList.add('active');
  toggleClient.classList.remove('active');
  });

toggleClient.addEventListener('click', () => {
  loginType = 'client';
  toggleClient.classList.add('active');
  toggleAdmin.classList.remove('active');
  });

showForgot.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.style.display = 'none';
    showForgot.parentElement.style.display = 'none';
  forgotSection.style.display = 'block';
});

backToLogin.addEventListener('click', (e) => {
  e.preventDefault();
  forgotSection.style.display = 'none';
  loginForm.style.display = '';
    showForgot.parentElement.style.display = '';
  resetMessage.textContent = '';
});

btnSendReset.addEventListener('click', async () => {
  const email = resetEmail.value.trim();
  if (!email) { resetMessage.textContent = 'Informe seu email'; return; }
  try {
    const response = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    resetMessage.textContent = data.message || 'Link enviado!';
    resetMessage.style.color = '#28a745';
  } catch (err) {
    resetMessage.textContent = 'Erro de conexao com o servidor';
    resetMessage.style.color = '#dc3545';
  }
});

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = '';

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      loginError.textContent = data.error || 'Erro ao efetuar login';
      return;
    }

    const user = await response.json();

    if (user.role === 'admin') {
      window.location.href = '/admin-v2.html';
    } else if (user.role === 'client') {
      window.location.href = '/client.html';
    } else if (user.role === 'subscriber') {
      window.location.href = '/subscribe.html';
    } else {
      loginError.textContent = 'Tipo de conta não reconhecido';
    }
  } catch (err) {
    loginError.textContent = 'Erro de conexão com o servidor';
  }
});
