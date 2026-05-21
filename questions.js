const rules = [
    { id: 0, text: "Is it a job that is required for a custom that is under maintenance with Jenzabar? (i.e. Nelnet, Transact)", yes: { type: 'end', result: 'J1 SAAS SQL Server', isSaas: true }, no: { type: 'next', step: 1 } },
    { id: 1, text: "Is it a Task Scheduler job?", yes: { type: 'end', result: 'Non-SAAS server', isSaas: false }, no: { type: 'next', step: 2 } },
    { id: 2, text: "Is it a custom job that reads or writes to a disk or share?", yes: { type: 'end', result: 'Non-SAAS server', isSaas: false }, no: { type: 'next', step: 3 } },
    { id: 3, text: "Does the job use Database Mail?", yes: { type: 'next', step: 4, note: 'You can use but not configure Database Mail profiles in J1 SAAS.' }, no: { type: 'next', step: 4, note: 'You can use but not configure Database Mail profiles in J1 SAAS.' } },
    { id: 4, text: "Is it a custom job that executes a SSIS package?", yes: { type: 'end', result: 'Non-SAAS server', isSaas: false }, no: { type: 'next', step: 5 } },
    { id: 5, text: "Is it a standard J1 job delivered by the Jenzabar DSU?", yes: { type: 'end', result: 'J1 SAAS SQL Server', isSaas: true }, no: { type: 'next', step: 6 } },
    { id: 6, text: "Is it the 'J1 LDAP Sync' job or a standard Retention/BI Core job?", yes: { type: 'end', result: 'J1 SAAS SQL Server', isSaas: true }, no: { type: 'next', step: 7 } },
    { id: 7, text: "Is it a custom job that requires third party software? (such as an SFTP executable)", yes: { type: 'end', result: 'Non-SAAS server', isSaas: false }, no: { type: 'next', step: 8 } },
    { id: 8, text: "Is it a custom job that runs PowerShell?", yes: { type: 'end', result: 'Non-SAAS server', isSaas: false }, no: { type: 'end', result: 'J1 SAAS SQL Server', isSaas: true } }
];