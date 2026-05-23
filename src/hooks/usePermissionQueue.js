import {useCallback, useEffect, useRef, useState} from 'react';
import {InteractionManager} from 'react-native';

const INITIAL_READY_DELAY_MS = 500;
const BETWEEN_TASKS_DELAY_MS = 300;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function usePermissionQueue() {
  const [isReady, setIsReady] = useState(false);
  const queueRef = useRef([]);
  const pendingNamesRef = useRef(new Set());
  const isMountedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const readyTimeoutRef = useRef(null);

  const processQueue = useCallback(async () => {
    if (!isMountedRef.current || !isReady || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;

    while (isMountedRef.current && queueRef.current.length > 0) {
      const nextItem = queueRef.current.shift();

      try {
        await nextItem.task();
      } catch (error) {
        console.error(`Erro ao processar etapa da fila: ${nextItem.name}`, error);
        nextItem.onError?.(error);
      } finally {
        pendingNamesRef.current.delete(nextItem.name);
      }

      if (queueRef.current.length > 0) {
        await wait(BETWEEN_TASKS_DELAY_MS);
      }
    }

    isProcessingRef.current = false;
  }, [isReady]);

  useEffect(() => {
    isMountedRef.current = true;
    const pendingNames = pendingNamesRef.current;
    const queue = queueRef.current;

    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      readyTimeoutRef.current = setTimeout(() => {
        readyTimeoutRef.current = null;

        if (isMountedRef.current) {
          setIsReady(true);
        }
      }, INITIAL_READY_DELAY_MS);
    });

    return () => {
      isMountedRef.current = false;

      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }

      interactionHandle.cancel();
      queue.length = 0;
      pendingNames.clear();
      isProcessingRef.current = false;
    };
  }, []);

  useEffect(() => {
    processQueue().catch(error => {
      console.error('Erro ao iniciar a fila de permissoes.', error);
    });
  }, [isReady, processQueue]);

  const enqueuePermission = useCallback((name, task, onError) => {
    if (!name || typeof task !== 'function') {
      return false;
    }

    if (pendingNamesRef.current.has(name)) {
      return false;
    }

    pendingNamesRef.current.add(name);
    queueRef.current.push({name, task, onError});

    processQueue().catch(error => {
      console.error(`Erro ao enfileirar etapa: ${name}`, error);
      pendingNamesRef.current.delete(name);
      onError?.(error);
    });

    return true;
  }, [processQueue]);

  return {
    isReady,
    enqueuePermission,
  };
}
