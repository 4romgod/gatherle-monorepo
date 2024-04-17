'use client';

import { ReactNode, useState } from 'react';
import InputBase from '@mui/material/InputBase';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import { useRouter } from 'next/navigation';
import { styled } from '@mui/material/styles';

const StyledSelect = styled(Select)(({ theme }) => ({
  padding: 5,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? theme.palette.secondary.dark
      : theme.palette.secondary.dark,
  color: 'white',
  borderRadius: 30,
}));

const StyledInput = styled(InputBase)(({ theme }) => ({
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

export default function DropDown<T extends Item>({
  itemList,
  defaultItem,
  renderItem,
}: DropDownProps<T>) {
  const [selectedItem, setSelectedItem] = useState<string>('');
  const router = useRouter();

  const onSelectChangeHandler = (event: any) => {
    const selectedItemName = event.target.value;
    setSelectedItem(selectedItemName);
    const selectedItem = itemList.find(
      (item) => item.name === selectedItemName,
    );

    if (selectedItem && selectedItem.name) {
      console.log(`#${selectedItem.name}`);
      router.push(`#${selectedItem.name}`);
    }
  };

  return (
    <FormControl variant="standard">
      <StyledSelect
        value={selectedItem}
        onChange={onSelectChangeHandler}
        input={<StyledInput />}
        displayEmpty={true}
      >
        <MenuItem value="">
          <em>{defaultItem}</em>
        </MenuItem>
        {itemList.map((item) => (
          <MenuItem key={item.name} value={item.name}>
            <div>{renderItem(item)}</div>
          </MenuItem>
        ))}
      </StyledSelect>
    </FormControl>
  );
}
