// PDF Worker
// This worker will handle PDF processing tasks

// Let the main thread know the worker is ready
self.postMessage('worker-ready');

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  const data = event.data;
  
  // Process messages from the main thread here
  console.log('Worker received:', data);
}); 