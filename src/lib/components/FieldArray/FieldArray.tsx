import * as React from 'react';
import { FieldGroup, GetKey } from '../';
import {
  defaultFieldArrayContextValue,
  FieldArrayContext,
  FieldArrayContextValue
} from '../../contexts/field-array-context';
import { FieldGroupContext, FieldGroupContextValue } from '../../contexts/field-group-context';
import { FormContext, FormContextValue } from '../../contexts/form-context';
import { assertNotNull, createPath, Path, selectDeep } from '../../utils';
import { isShallowEqual } from '../../utils/isShallowEqual';

export type AddItem<Item> = (item: Item) => void;

export interface InnerFieldArrayProps<Item> {
  items: Item[];
  addItem: AddItem<Item>;
}

export interface FieldArrayProps<Item> {
  name: string;
  render: React.StatelessComponent<InnerFieldArrayProps<Item>>;
  getKey?: GetKey<Item>;
}

export class FieldArray extends React.Component<FieldArrayProps<any>, {}> {
  public render() {
    return (
      <FieldGroupContext.Consumer>
        {groupContext => (
          <FormContext.Consumer>
            {formContext => (
              <FieldArrayWithoutContext
                groupContext={groupContext}
                formContext={assertNotNull(formContext, 'You cannot use the FieldArray outside a form')}
                fieldArrayProps={this.props}
              />
            )}
          </FormContext.Consumer>
        )}
      </FieldGroupContext.Consumer>
    );
  }

  public shouldComponentUpdate(nextProps: FieldArrayProps<any>) {
    return isShallowEqual(this.props, nextProps);
  }
}

export interface FieldArrayWithoutContextProps<Item> {
  fieldArrayProps: FieldArrayProps<Item>;
  groupContext: FieldGroupContextValue;
  formContext: FormContextValue<any>;
}

class FieldArrayWithoutContext extends React.Component<FieldArrayWithoutContextProps<any>, {}> {
  private items: any[];
  private path: Path;
  private identifier: string;

  public render() {
    const { name, render } = this.props.fieldArrayProps;
    this.updatePathAndIdentifier();
    this.items = this.getItems();

    return (
      <FieldGroup name={name}>
        <FieldArrayContext.Provider value={this.createChildContext()}>
          {render({
            addItem: this.addItem,
            items: this.items,
          })}
        </FieldArrayContext.Provider>
      </FieldGroup>
    );
  }

  private updatePathAndIdentifier(): void {
    const { groupContext, fieldArrayProps: { name } } = this.props;
    this.path = createPath(groupContext.path, name);
    this.identifier = createPath(groupContext.namespace, name);
  }

  public componentDidMount() {
    this.props.formContext.onFieldMount(this.identifier);
  }

  public shouldComponentUpdate(nextProps: FieldArrayWithoutContextProps<any>) {
    return !(selectArrayFromProps(this.props) === selectArrayFromProps(nextProps))
      || !(this.props.formContext.onFieldChange === nextProps.formContext.onFieldChange)
      || !isShallowEqual(this.props.groupContext, nextProps.groupContext)
      || !isShallowEqual(this.props.fieldArrayProps, nextProps.fieldArrayProps);
  }

  private addItem: AddItem<any> = (item) => {
    const newArray = [...this.items, item];
    this.setArray(newArray);
  };

  private getItems(): any[] {
    return selectArrayFromProps(this.props);
  }

  private setArray(newArray: any[]): void {
    const { onFieldChange } = this.props.formContext;
    onFieldChange(this.identifier, this.path, newArray);
  }

  private createChildContext(): FieldArrayContextValue {
    const { getKey } = this.props.fieldArrayProps;
    if (getKey) {
      return { getKey };
    } else {
      return defaultFieldArrayContextValue;
    }
  }
}

function selectArrayFromProps<Item>(props: FieldArrayWithoutContextProps<Item>): Item[] {
  const { form: { state: { model } } } = props.formContext;
  const path = createPath(props.groupContext.path, props.fieldArrayProps.name);
  return selectDeep({ object: model, path });
}
