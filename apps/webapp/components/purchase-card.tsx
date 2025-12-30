'use client';

import React, { useState } from 'react';
import { Card, CardContent, Typography, Button, Box, IconButton } from '@mui/material';
import { styled } from '@mui/system';
import { FaPlus, FaMinus, FaTicketAlt } from 'react-icons/fa';

const StyledCard = styled(Card)(({ theme }) => ({
  maxWidth: 350,
  margin: 'auto',
  backgroundColor: 'inherit',
  borderRadius: theme.shape.borderRadius,
  //   boxShadow: theme.shadows?[3],
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
  },
}));

const PriceTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.secondary.main,
  fontWeight: 'bold',
  fontSize: '2rem',
}));

const QuantityBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

const QuantityButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.secondary.main,
  color: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.secondary.dark,
  },
}));

const QuantityTypography = styled(Typography)(({ theme }) => ({
  margin: theme.spacing(0, 2),
  fontSize: '1.5rem',
}));

const PurchaseButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

// TODO what if we have different ticket types??? (e.g. General, VIP, etc.) https://www.eventbrite.com/e/mayweather-vs-gotti-fight-night-event-at-guesthouse-tickets-991480253127?aff=erellivmlt
export default function PurchaseCard() {
  const [quantity, setQuantity] = useState(1);
  const basePrice = 90; // TODO default this to price of the ticket

  const handleIncrement = () => {
    setQuantity(prevQuantity => prevQuantity + 1);
  };

  const handleDecrement = () => {
    setQuantity(prevQuantity => Math.max(prevQuantity - 1, 1));
  };

  const totalPrice = basePrice * quantity;

  return (
    <StyledCard>
      <CardContent>
        <Typography variant="h5" component="div" gutterBottom>
          <FaTicketAlt /> Event Ticket
        </Typography>
        <PriceTypography>R{basePrice.toFixed(2)}</PriceTypography>
        <Typography variant="body2" color="text.secondary">
          per ticket
        </Typography>
        <QuantityBox>
          <QuantityButton aria-label="Decrease quantity" onClick={handleDecrement}>
            <FaMinus />
          </QuantityButton>
          <QuantityTypography>{quantity}</QuantityTypography>
          <QuantityButton aria-label="Increase quantity" onClick={handleIncrement}>
            <FaPlus />
          </QuantityButton>
        </QuantityBox>
        <Typography variant="h6" gutterBottom>
          Total: R{totalPrice.toFixed(2)}
        </Typography>
        <PurchaseButton variant="contained" fullWidth aria-label="Purchase tickets">
          Purchase Tickets
        </PurchaseButton>
      </CardContent>
    </StyledCard>
  );
}
