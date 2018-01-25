import { assertPropertyInObject } from './assertPropertyInObject';

export interface UpdateDeepArgs<T> {
  object: T;
  path: string[];
  value: any;
  assert?: boolean;
}

export function updateDeep<T>({object, path, value, assert = true}: UpdateDeepArgs<T>): T {
  if (path.length <= 0) {
    throw new Error('The path cannot be empty');
  }
  const lastIndex = path.length - 1;
  const tail = path.slice(0, lastIndex);
  const keyToUpdate = path[lastIndex];

  const { copy: result, selectedObject: objectToUpdate } = selectDeepAndCopy({ object, path: tail, assert });
  assert && assertPropertyInObject(objectToUpdate, keyToUpdate);
  objectToUpdate[keyToUpdate] = value;

  return result;
}

interface SelectDeepAndCopyArgs<T> {
  object: T;
  path: string[];
  assert?: boolean;
}

function selectDeepAndCopy<T>({object, path, assert = true}: SelectDeepAndCopyArgs<T>): { copy: T, selectedObject: any } {
  path = path.slice(); // Copy the path
  const copy = copyArrayOrObject(object);

  let selectedObject: any = copy;
  while (path.length > 0) {
    const key = path.splice(0, 1)[0];
    if (assert) {
      assertPropertyInObject(selectedObject, key);
    } else {
      ensurePropertyInObject(selectedObject, key);
    }

    const lastObject = selectedObject;
    selectedObject = copyArrayOrObject(selectedObject[key]);
    lastObject[key] = selectedObject;
  }

  return { copy, selectedObject };
}

function copyArrayOrObject<T>(object: T): T {
  if (object instanceof Array) {
    return object.slice() as any;
  } else {
    return Object.assign({}, object);
  }
}

function ensurePropertyInObject(object: any, key: string): void {
  const objectHasKey = key in object;
  if (!objectHasKey) {
    object[key] = {};
  }
}
