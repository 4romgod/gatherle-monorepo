'use client';

// Insipred by https://dev.to/vvo/show-a-top-progress-bar-on-fetch-and-router-events-in-next-js-4df3
import Router from 'next/router';
import NProgress from 'nprogress';

enum ROUTING_STATE {
  loading = 'loading',
  stopped = 'stopped',
}

let timer: NodeJS.Timeout;
let state: ROUTING_STATE;
let activeRequests = 0;
const delay = 150;

function load() {
  if (state === ROUTING_STATE.loading) return;
  state = ROUTING_STATE.loading;
  timer = setTimeout(() => {
    NProgress.start();
  }, delay); // only show progress bar if it takes longer than the delay
}

function stop() {
  if (activeRequests > 0) return;
  state = ROUTING_STATE.stopped;
  clearTimeout(timer);
  NProgress.done();
}

Router.events.on('routeChangeStart', load);
Router.events.on('routeChangeComplete', stop);
Router.events.on('routeChangeError', stop);

const originalFetch = window.fetch;
window.fetch = async function (...args) {
  if (activeRequests === 0) {
    load();
  }

  activeRequests++;

  try {
    const response = await originalFetch(...args);
    return response;
  } catch (error) {
    console.log(error);
    return Promise.reject(error);
  } finally {
    activeRequests -= 1;
    if (activeRequests === 0) {
      stop();
    }
  }
};

export default function TopProgressBar() {
  return null;
}
