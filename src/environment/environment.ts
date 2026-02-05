const isLan = window.location.hostname.startsWith('192.168.');

export const environment = {
  production: false,
  // apiUrl:'https://hrminds-812956739285.us-east4.run.app/api',
  // apiUrl:'http://localhost:3002/api',
  //  apiUrl:'http://192.168.3.25:3002/api'
  // apiUrl:'http://223.30.118.2:3002/api'
  apiUrl:'http://127.0.0.1:3002/api'
  // apiUrl: '/api'
    // apiUrl: isLan
    // ? 'http://192.168.8.189:3002/api'
    // : '/api'
};
