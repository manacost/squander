export const mount_all = (...t: (() => void)[]) => {
  let list: (() => void)[] = [];

  list.push(...t);

  const unsub_all = () => {
    for (const cb of list) {
      cb();
    }
    list = [];
  };

  return unsub_all;
};
