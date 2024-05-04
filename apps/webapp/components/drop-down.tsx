'use client';

import { ReactNode, useState } from 'react';
import InputBase from '@mui/material/InputBase';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectProps } from '@mui/material/Select';
import { useRouter } from 'next/navigation';
import { Theme, styled } from '@mui/material/styles';

// TODO MUIStyledCommonProps<Theme> cannot be found, using any for now
type StyledSelectProps = (SelectProps<unknown> & any) & {
  theme: Theme;
  isdefaultselected: 'false';
};

const StyledSelect = styled(Select)<StyledSelectProps>(({ theme, isdefaultselected = 'true' }) => ({
  padding: 5,
  backgroundColor:
    isdefaultselected == 'true'
      ? '#F6F7F8'
      : theme.palette.mode === 'dark'
      ? theme.palette.secondary.dark
      : theme.palette.secondary.dark,
  color: isdefaultselected == 'true' ? 'black' : 'white',
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

export default function DropDown<T extends Item>({ itemList, defaultItem, renderItem }: DropDownProps<T>) {
  const [selectedItem, setSelectedItem] = useState<string>('');
  const router = useRouter();

  const onSelectChangeHandler = (event: any) => {
    const selectedItemName = event.target.value;
    setSelectedItem(selectedItemName);
    const selectedItem = itemList.find((item) => item.name === selectedItemName);

    if (selectedItem && selectedItem.name) {
      console.log(`#${selectedItem.name}`);
      router.push(`#${selectedItem.name}`);
    }
  };

  const isdefaultselected = (!selectedItem).toString();

  return (
    <FormControl variant="standard">
      <StyledSelect
        value={selectedItem}
        onChange={onSelectChangeHandler}
        input={<StyledInput />}
        displayEmpty={true}
        isdefaultselected={isdefaultselected}
      >
        <MenuItem value="">{defaultItem}</MenuItem>
        {itemList.map((item) => (
          <MenuItem key={item.name} value={item.name}>
            <div>{renderItem(item)}</div>
          </MenuItem>
        ))}
      </StyledSelect>
    </FormControl>
  );
}
