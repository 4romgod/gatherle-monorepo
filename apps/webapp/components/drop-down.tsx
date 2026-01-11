'use client';

import { ReactNode, useState } from 'react';
import InputBase from '@mui/material/InputBase';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { styled } from '@mui/material/styles';
import { navigateToHash } from '@/lib/utils/navigation';

const StyledSelect = styled(Select<string>, { shouldForwardProp: prop => prop !== 'isDefaultSelected' })<{
  isDefaultSelected: boolean;
}>(({ theme, isDefaultSelected }) => ({
  padding: 5,
  backgroundColor:
    isDefaultSelected === true
      ? '#F6F7F8'
      : theme.palette.mode === 'dark'
        ? theme.palette.secondary.dark
        : theme.palette.secondary.dark,
  color: isDefaultSelected === true ? 'black' : 'white',
  borderRadius: 30,
}));

const StyledInput = styled(InputBase)(() => ({
  '& .MuiInputBase-input': {
    borderRadius: 4,
    position: 'relative',
    fontSize: 16,
    padding: '10px 26px 10px 12px',
  },
}));

export interface Item {
  id: string;
  name: string;
}

interface DropDownProps<T extends Item> {
  defaultItem: string;
  itemList: T[];
  renderItem: (item: T) => ReactNode;
}

export default function DropDown<T extends Item>({ itemList, defaultItem, renderItem }: DropDownProps<T>) {
  const [selectedItem, setSelectedItem] = useState<string>('');

  const onSelectChangeHandler = (event: SelectChangeEvent<string>) => {
    const selectedItemName = event.target.value;
    setSelectedItem(selectedItemName);
    const selectedItem = itemList.find(item => item.name === selectedItemName);

    if (selectedItem && selectedItem.name) {
      console.log(`#${selectedItem.name}`);
      navigateToHash(selectedItem.name);
    }
  };

  const isDefaultSelected = !selectedItem;

  return (
    <FormControl variant="standard">
      <StyledSelect
        value={selectedItem}
        onChange={onSelectChangeHandler}
        input={<StyledInput />}
        displayEmpty={true}
        isDefaultSelected={isDefaultSelected}
      >
        <MenuItem value="">{defaultItem}</MenuItem>
        {itemList.map(item => (
          <MenuItem key={item.name} value={item.name}>
            <div>{renderItem(item)}</div>
          </MenuItem>
        ))}
      </StyledSelect>
    </FormControl>
  );
}
