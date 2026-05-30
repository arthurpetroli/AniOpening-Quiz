type QueueTask<T> = () => Promise<T>;

let queue = Promise.resolve();
let lastRunAt = 0;

function wait(ms: number) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export function enqueueRateLimited<T>(task: QueueTask<T>, minIntervalMs = 1500) {
  const run = queue.then(async () => {
    const elapsed = Date.now() - lastRunAt;

    if (elapsed < minIntervalMs) {
      await wait(minIntervalMs - elapsed);
    }

    lastRunAt = Date.now();
    return task();
  });

  queue = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}
