export function createMutex() {
  let tail = Promise.resolve();

  return function runExclusive(operation) {
    const result = tail.then(operation, operation);
    tail = result.then(
      () => {},
      () => {},
    );
    return result;
  };
}
