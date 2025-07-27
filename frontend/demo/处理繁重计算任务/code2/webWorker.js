function useWebWorker() {
    const worker = new Worker('heavyCalc.js');
    worker.postMessage('start');
    worker.onmessage = function(event) {
        console.log(event.data);
    }
}