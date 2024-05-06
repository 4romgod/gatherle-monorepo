import { ReactElement, cloneElement } from 'react';
import { Modal } from '@mui/base/Modal';
import { styled } from '@mui/material';
import CustomBackdrop from '@/components/modal/custom-backdrop';

export type CustomModalProps = {
  triggerButton: ReactElement;
  modalContent: ReactElement;
  handleClose: () => void;
  handleOpen: () => void;
  isOpen: boolean;
};

const StyledModal = styled(Modal)({
  position: 'fixed',
  zIndex: 1300,
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const CustomModal = ({ triggerButton, modalContent, isOpen, handleClose, handleOpen }: CustomModalProps) => {
  return (
    <div>
      {cloneElement(triggerButton, { onClick: () => handleOpen() })}
      <StyledModal
        aria-labelledby="unstyled-modal-title"
        aria-describedby="unstyled-modal-description"
        open={isOpen}
        onClose={handleClose}
        slots={{ backdrop: CustomBackdrop }}
      >
        {modalContent}
      </StyledModal>
    </div>
  );
};

export default CustomModal;
