'use client';

import { ReactNode, useState } from 'react';
import InputBase from '@mui/material/InputBase';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { styled } from '@mui/material/styles';
import { useRouter } from 'next/navigation';

const BootstrapInput = styled(InputBase)(({ theme }) => ({
  '& .MuiInputBase-input': {
    borderRadius: 4,
    position: 'relative',
    backgroundColor: 'blue',
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

  const onSelectChangeHandler = (event: SelectChangeEvent) => {
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
    <FormControl fullWidth variant="standard">
      <Select
        value={selectedItem}
        onChange={onSelectChangeHandler}
        input={<BootstrapInput />}
        sx={{
          backgroundColor: 'blue',
          color: 'white',
          '&:hover': {
            backgroundColor: 'green',
          },
        }}
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
      </Select>
    </FormControl>
  );
}
