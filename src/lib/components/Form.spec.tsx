import { act, cleanup, fireEvent, render } from '@testing-library/react';
import * as React from 'react';
import { MutableRefObject, useCallback, useState } from 'react';
import {
  FieldArray,
  FieldArrayItems,
  FieldArrayItemsRender,
  FieldArrayRender,
  FieldGroup,
  FormRef,
} from '.';
import { delay } from '../../testUtils/delay';
import { InputField, InputFieldProps } from '../../testUtils/InputField';
import { path } from '../models';
import { DEFAULT_FIELD_STATUS, FieldStatus } from '../statusTracking';
import {
  ArrayValidation,
  ValidationDefinition,
  ValidationFunction,
} from '../validation';
import { Form, FormProps } from './Form';

afterEach(cleanup);

describe('Form', () => {
  interface Address {
    street: string;
  }

  interface Model {
    name: string;
    country: string;
    address: Address;
    children: Model[];
  }

  const defaultModel: Model = {
    name: '',
    country: '',
    address: {
      street: '',
    },
    children: [],
  };

  interface TestComponentProps {
    initialModel: Model;
    formProps?: Partial<FormProps<Model>>;
    onModelChange?: (model: Model) => void;
    showErrorIfDirty?: boolean;
  }

  function ModelFields(inputProps: Partial<InputFieldProps>) {
    const renderChildItem: FieldArrayItemsRender<Model> = useCallback(
      ({ remove }) => (
        <div>
          <ModelFields {...inputProps} />
          <button type="button" onClick={remove}>
            Remove
          </button>
        </div>
      ),
      [inputProps]
    );

    const renderChildren: FieldArrayRender<Model> = useCallback(
      ({ addItem }) => (
        <>
          <FieldArrayItems render={renderChildItem} />
          <button type="button" onClick={() => addItem(defaultModel)}>
            Add Child
          </button>
        </>
      ),
      [renderChildItem]
    );

    return (
      <>
        <InputField label="Name" name={path<Model>().name} {...inputProps} />
        <InputField
          label="Country"
          name={path<Model>().country}
          {...inputProps}
        />
        <FieldGroup name={path<Model>().address}>
          <InputField
            label="Street"
            name={path<Address>().street}
            {...inputProps}
          />
        </FieldGroup>
        <FieldArray name={path<Model>().children} render={renderChildren} />
      </>
    );
  }

  function TestComponent({
    initialModel,
    formProps = {},
    onModelChange: handleModelChange,
    showErrorIfDirty,
  }: TestComponentProps) {
    const [value, setValue] = useState<Model>(initialModel);
    handleModelChange && handleModelChange(value);
    const inputProps: Partial<InputFieldProps> = {
      showErrorIfDirty,
    };

    return (
      <Form value={value} onChange={setValue} {...formProps}>
        <ModelFields {...inputProps} />
        <button type="submit">Submit</button>
      </Form>
    );
  }

  it('should render values', () => {
    const { getByLabelText, getAllByLabelText } = render(
      <TestComponent
        initialModel={{
          name: 'Paul',
          country: 'Germany',
          address: {
            street: 'Sesamstreet',
          },
          children: [
            {
              ...defaultModel,
              name: 'Kristine',
              address: {
                street: 'Other Street',
              },
            },
          ],
        }}
      />
    );

    expect(getAllByLabelText('Name')[0]).toMatchObject({ value: 'Paul' });
    expect(getAllByLabelText('Country')[0]).toMatchObject({ value: 'Germany' });
    expect(getAllByLabelText('Street')[0]).toMatchObject({
      value: 'Sesamstreet',
    });
    expect(getAllByLabelText('Name')[1]).toMatchObject({ value: 'Kristine' });
    expect(getAllByLabelText('Country')[1]).toMatchObject({ value: '' });
    expect(getAllByLabelText('Street')[1]).toMatchObject({
      value: 'Other Street',
    });
  });

  it('should update values if input changes', () => {
    const handleModelChange = jest.fn();
    const { getByLabelText, getAllByLabelText, getByText } = render(
      <TestComponent
        initialModel={{
          ...defaultModel,
          name: '',
          country: '',
        }}
        onModelChange={handleModelChange}
      />
    );

    fireInputEvent(getByLabelText('Name'), 'Christian');
    fireInputEvent(getByLabelText('Country'), 'Spain');
    fireInputEvent(getByLabelText('Street'), 'Street1');
    fireEvent.click(getByText('Add Child'));
    fireInputEvent(getAllByLabelText('Name')[1], 'Child1');
    fireInputEvent(getAllByLabelText('Country')[1], 'England');
    fireInputEvent(getAllByLabelText('Street')[1], 'Street2');

    expect(handleModelChange).toHaveBeenCalledWith({
      name: 'Christian',
      country: 'Spain',
      address: {
        street: 'Street1',
      },
      children: [
        {
          name: 'Child1',
          country: 'England',
          children: [],
          address: {
            street: 'Street2',
          },
        },
      ],
    });

    fireEvent.click(getByText('Remove'));

    expect(handleModelChange).toHaveBeenCalledWith({
      name: 'Christian',
      country: 'Spain',
      address: {
        street: 'Street1',
      },
      children: [],
    });
  });

  it('should expose status with onStatusChange', async () => {
    const onStatusChange = jest.fn();
    const { getByLabelText } = render(
      <TestComponent
        initialModel={defaultModel}
        formProps={{ onStatusChange }}
      />
    );

    await act(() => delay(50));
    expect(onStatusChange).toHaveBeenLastCalledWith({
      name: DEFAULT_FIELD_STATUS,
      country: DEFAULT_FIELD_STATUS,
      address: DEFAULT_FIELD_STATUS,
      'address.street': DEFAULT_FIELD_STATUS,
      children: DEFAULT_FIELD_STATUS,
    });

    fireEvent.blur(getByLabelText('Name'));

    expect(onStatusChange).toHaveBeenLastCalledWith({
      name: new FieldStatus({ touched: true }),
      country: DEFAULT_FIELD_STATUS,
      address: DEFAULT_FIELD_STATUS,
      'address.street': DEFAULT_FIELD_STATUS,
      children: DEFAULT_FIELD_STATUS,
    });
  });

  it('should allow controlled status', async () => {
    const onStatusChange = jest.fn();
    const { getByLabelText, queryByText, rerender } = render(
      <TestComponent
        initialModel={defaultModel}
        formProps={{
          status: {
            name: DEFAULT_FIELD_STATUS,
          },
          onStatusChange,
          validation: {
            name: () => 'TEST ERROR',
          },
        }}
      />
    );
    const isNameErrorVisible = () => {
      return queryByText('TEST ERROR') != null;
    };

    await act(() => delay(50));
    expect(isNameErrorVisible()).toBe(false);

    fireEvent.blur(getByLabelText('Name')); // Should have no effect
    expect(isNameErrorVisible()).toBe(false);
    expect(onStatusChange).toHaveBeenLastCalledWith({
      name: new FieldStatus({ touched: true }),
    });

    rerender(
      <TestComponent
        initialModel={defaultModel}
        formProps={{
          status: {
            name: new FieldStatus({ touched: true }),
          },
          validation: {
            name: () => 'TEST ERROR',
          },
        }}
      />
    );
    expect(isNameErrorVisible()).toBe(true);
  });

  it('should call submit', () => {
    const props: Partial<FormProps<Model>> = {
      onSubmit: jest.fn(),
    };
    const { getByText } = render(
      <TestComponent initialModel={defaultModel} formProps={props} />
    );

    fireEvent.click(getByText('Submit'));

    expect(props.onSubmit).toHaveBeenCalled();
  });

  it('should use the "accessor" on the FieldGroup as a key to access the value', () => {
    interface InnerModel {
      items: Array<{
        a: string;
      }>;
    }

    function MyForm() {
      const [value, setValue] = useState<InnerModel>({
        items: [{ a: 'x' }, { a: 'y' }],
      });

      return (
        <Form value={value} onChange={setValue}>
          <FieldArray
            name={path<InnerModel>().items}
            getKey={i => i.a}
            render={() => (
              <FieldGroup
                name={path<InnerModel['items']>()[0]}
              >
                <InputField name={path<InnerModel['items'][number]>().a} />
              </FieldGroup>
            )}
          />
        </Form>
      );
    }

    expect(() => render(<MyForm />)).not.toThrowError();
  });

  it('should provide the "onValueChange" callback on fields', () => {
    const handleChange = jest.fn();

    function MyForm() {
      const [value, setValue] = useState<any>({
        a: 0,
      });

      return (
        <Form value={value} onChange={setValue}>
          <InputField label="A" name="a" onValueChange={handleChange} />
        </Form>
      );
    }

    const { getByLabelText } = render(<MyForm />);

    fireInputEvent(getByLabelText('A'), 'Hello');

    expect(handleChange).toHaveBeenCalledWith('Hello');
  });

  it('should provide "submit" over imperative API', () => {
    const ref: MutableRefObject<FormRef | null> = { current: null };
    const props: Partial<FormProps<Model>> = {
      onSubmit: jest.fn(),
      ref,
    };
    render(<TestComponent initialModel={defaultModel} formProps={props} />);

    act(() => {
      ref.current!.submit();
    });

    expect(props.onSubmit).toHaveBeenCalled();
  });

  it('should throw an error if model does not match in strict mode', () => {
    function MyForm() {
      const [value, setValue] = useState<any>({
        a: 0,
      });

      return (
        <Form strict value={value} onChange={setValue}>
          <InputField label="B" name="b" />
        </Form>
      );
    }

    console.error = jest.fn();
    expect(() => render(<MyForm/>)).toThrowErrorMatchingInlineSnapshot(
      `"The key \\"b\\" does not exits on item {\\"a\\":0}."`
    );
  });

  it('should not throw an error if model does not match and strict mode is disabled', () => {
    function MyForm() {
      const [value, setValue] = useState<any>({
        a: 0,
      });

      return (
        <Form value={value} onChange={setValue} strict={false}>
          <InputField label="B" name="b" />
        </Form>
      );
    }

    expect(() => render(<MyForm />)).not.toThrowError();
  });

  it('should not throw an error if model does not match and is updated', () => {
    function MyForm() {
      const [value, setValue] = useState<any>({
        a: 0,
      });

      return (
        <Form value={value} onChange={setValue} strict={false}>
          <InputField label="B" name="b" />
        </Form>
      );
    }

    const { getByLabelText } = render(<MyForm />);

    expect(() => {
      fireInputEvent(getByLabelText('B'), 'New Value');
    }).not.toThrowError();
  });

  describe('Validation', () => {
    const minLengthErrorMessage = 'More items required';
    const minLength = (
      length: number
    ): ValidationFunction<{ length: number }> => value =>
      value.length < length ? minLengthErrorMessage : null;

    const validation: ValidationDefinition<Model> = {
      name: minLength(3),
      address: {
        street: minLength(3),
      },
      children: new ArrayValidation<Model[]>(
        {
          name: minLength(4),
        },
        minLength(1)
      ),
    };

    it('should call invalidSubmit if invalid', () => {
      const props: Partial<FormProps<Model>> = {
        validation,
        onSubmit: jest.fn(),
        onValidSubmit: jest.fn(),
        onInValidSubmit: jest.fn(),
      };
      const { getByText } = render(
        <TestComponent initialModel={defaultModel} formProps={props} />
      );

      fireEvent.click(getByText('Submit'));

      expect(props.onSubmit).toHaveBeenCalled();
      expect(props.onValidSubmit).not.toHaveBeenCalled();
      expect(props.onInValidSubmit).toHaveBeenCalled();
    });

    it('should call validSubmit if valid', () => {
      const props: Partial<FormProps<Model>> = {
        validation,
        onSubmit: jest.fn(),
        onValidSubmit: jest.fn(),
        onInValidSubmit: jest.fn(),
      };
      const { getByText } = render(
        <TestComponent
          initialModel={{
            ...defaultModel,
            name: '123',
            address: {
              street: '123',
            },
            children: [
              {
                ...defaultModel,
                name: '1234',
              },
            ],
          }}
          formProps={props}
        />
      );

      fireEvent.click(getByText('Submit'));

      expect(props.onSubmit).toHaveBeenCalled();
      expect(props.onValidSubmit).toHaveBeenCalled();
      expect(props.onInValidSubmit).not.toHaveBeenCalled();
    });

    it('should not display error if not touched', () => {
      const props: Partial<FormProps<Model>> = {
        validation,
      };
      const { queryByText } = render(
        <TestComponent initialModel={defaultModel} formProps={props} />
      );

      expect(queryByText(minLengthErrorMessage)).toBeNull();
    });

    it('should display error if touched', async () => {
      const props: Partial<FormProps<Model>> = {
        validation,
      };
      const handleModelChange = jest.fn();
      const { getAllByLabelText, getByText } = render(
        <TestComponent
          initialModel={{
            ...defaultModel,
            children: [defaultModel],
          }}
          onModelChange={handleModelChange}
          formProps={props}
        />
      );
      const nameInput = getAllByLabelText('Name')[0];
      const streetInput = getAllByLabelText('Street')[0];
      const childNameInput = getAllByLabelText('Name')[1];

      act(() => {
        fireEvent.blur(nameInput);
      });

      expect(nameInput.parentNode).toHaveTextContent(minLengthErrorMessage);
      expect(streetInput.parentNode).not.toHaveTextContent(
        minLengthErrorMessage
      );
      expect(childNameInput.parentNode).not.toHaveTextContent(
        minLengthErrorMessage
      );

      // Submit touches all
      act(() => {
        fireEvent.click(getByText('Submit'));
      });

      expect(nameInput.parentNode).toHaveTextContent(minLengthErrorMessage);
      expect(streetInput.parentNode).toHaveTextContent(minLengthErrorMessage);
      expect(childNameInput.parentNode).toHaveTextContent(
        minLengthErrorMessage
      );

      // It should not update in an endless loop
      await act(() => delay(1000));
      expect(handleModelChange.mock.calls.length < 10).toBe(true);
    });

    it('should display error if dirty and option is set', () => {
      const props: Partial<FormProps<Model>> = {
        validation,
      };
      const { queryByText, getByLabelText } = render(
        <TestComponent
          initialModel={{
            ...defaultModel,
            name: '',
            country: '',
          }}
          formProps={props}
          showErrorIfDirty={true}
        />
      );

      fireEvent.input(getByLabelText('Name'), { target: { value: '1' } });

      expect(queryByText(minLengthErrorMessage)).not.toBeNull();
    });

    it('should not display error if error is fixed', () => {
      const props: Partial<FormProps<Model>> = {
        validation,
      };
      const { getByLabelText } = render(
        <TestComponent initialModel={defaultModel} formProps={props} />
      );
      const nameInput = getByLabelText('Name');

      fireEvent.blur(nameInput);

      expect(nameInput.parentNode).toHaveTextContent(minLengthErrorMessage);

      fireInputEvent(nameInput, '123');

      expect(nameInput.parentNode).not.toHaveTextContent(minLengthErrorMessage);
    });

    it('should pass errors to onErrorsChange', () => {
      const props: Partial<FormProps<Model>> = {
        validation,
        onErrorsChange: jest.fn(),
      };
      render(<TestComponent initialModel={defaultModel} formProps={props} />);

      expect(props.onErrorsChange).toHaveBeenCalledWith({
        name: minLengthErrorMessage,
        'address.street': minLengthErrorMessage,
        children: minLengthErrorMessage,
      });
    });
  });
});

function fireInputEvent(element: Element, value: any) {
  return fireEvent.input(element, { target: { value } });
}
