import * as React from 'react';
import { memo, useCallback, useMemo } from 'react';
import { useFieldArrayContext } from '../contexts/fieldArrayContext';
import {
  FieldContext,
  FieldContextProvider,
  FieldContextValue,
  useFieldContext,
} from '../contexts/fieldContext';
import { DELETE } from '../utils';

export type SetArray<Item> = (newArray: Item[]) => void;

export interface InnerFieldArrayItemProps<Item> {
  remove: () => void;
  item: Item;
  index: number;
  setArray: SetArray<Item>;
}

export type GetKey<Item> = (item: Item, index: number) => any;

export type FieldArrayItemsRender<Item> = (
  props: InnerFieldArrayItemProps<Item>
) => React.ReactElement;

export interface FieldArrayItemsProps<Item> {
  render: FieldArrayItemsRender<Item>;
}

function _FieldArrayItems<Item = any>(props: FieldArrayItemsProps<Item>) {
  const { getKey } = useFieldArrayContext();
  const { value: array, setValue: setArray } = useFieldContext<Item[]>();
  const { render } = props;

  const elements = useMemo(() => {
    return array.map((item, index) => (
      <FieldArrayItem<Item>
        setArray={setArray}
        key={getKey(item, index)}
        item={item}
        index={index}
        render={render}
      />
    ));
  }, [array, getKey, render, setArray]);

  return <>{elements}</>;
}

export type FieldArrayItems = typeof _FieldArrayItems;
export const FieldArrayItems: FieldArrayItems = memo(_FieldArrayItems) as any;

interface FieldArrayItemProps<Item> {
  index: number;
  item: Item;
  setArray: SetArray<Item>;
  render: FieldArrayItemsRender<Item>;
}

function _FieldArrayItem<Item>({
  index,
  item,
  setArray,
  render,
}: FieldArrayItemProps<Item>) {
  const relativePath = String(index);
  const renderItem = useCallback(
    (fieldContext: FieldContextValue<Item>) =>
      render({
        remove: () => fieldContext.setValue(DELETE as any),
        setArray,
        index,
        item,
      }),
    [render, setArray, index, item]
  );

  return useMemo(
    () => (
      <FieldContextProvider
        relativePath={relativePath}
      >
        <FieldContext.Consumer>{renderItem as any}</FieldContext.Consumer>
      </FieldContextProvider>
    ),
    [relativePath, renderItem]
  );
}

const FieldArrayItem: typeof _FieldArrayItem = memo(_FieldArrayItem) as any;
