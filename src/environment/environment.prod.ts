const isLan = window.location.hostname.startsWith('192.168.');

export const environment = {
  production: true,
  // Feature flag — hide payroll-run sections for clients without payroll (e.g. JMRH).
  // Other clients: set true to show Payroll Summary (COO) + Payroll Readiness (HR Ops).
  payrollEnabled: false,
  // Feature flag — show the Weekly Tracker nav module. On for IM; set false for
  // clients that don't use it (e.g. JMRH).
  weeklyTrackerEnabled: false,
  // Feature flag — show salary/CTC-derived analytics (OT-vs-hire cost). Off for
  // clients without salary data (e.g. JMRH); set true where SalaryStructure is populated.
  salaryDataEnabled: false,
  // apiUrl:'https://hrminds-812956739285.us-east4.run.app/api',
  // apiUrl:'http://localhost:3002/api', 
  //  apiUrl:'http://192.168.8.189:3002/api'
  // apiUrl:'http://223.30.118.2:3002/api'
  // apiUrl: '/api'
  // apiUrl:'http://127.0.0.1:3002/api'
    apiUrl: isLan
    ? 'http://192.168.8.189:3002/api'
    : '/api'
    // apiUrl: 'https://hrmindsjmrh.imapps.in/api'
      // apiUrl: 'https://hrminds-im-812956739285.us-east4.run.app/api'

};
