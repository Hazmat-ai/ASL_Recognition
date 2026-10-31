import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'tests/e2e',use:{baseURL:'http://localhost:3000',headless:true},webServer:{command:'npm start',url:'http://localhost:3000/api/health',reuseExistingServer:false,env:{APP_ORIGIN:'http://localhost:3000',DB_PATH:'data/e2e.sqlite'}},projects:[{name:'chromium',use:{browserName:'chromium'}}]});
