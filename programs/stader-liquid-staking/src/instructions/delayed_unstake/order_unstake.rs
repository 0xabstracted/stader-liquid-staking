use anchor_lang::prelude::*;
use anchor_spl::token::{burn, Burn, Mint, Token, TokenAccount};

use crate::{
    checks::check_token_source_account, error::StaderLiquidStakingError,
    events::delayed_unstake::OrderUnstakeEvent, state::delayed_unstake_ticket::TicketAccountData,
    State,
};

#[derive(Accounts)]
pub struct OrderUnstake<'info> {
    #[account(
        mut,
        has_one = stader_sol_mint
    )]
    pub state: Box<Account<'info, State>>,
    #[account(mut)]
    pub stader_sol_mint: Box<Account<'info, Mint>>,

    // Note: Ticket beneficiary is burn_stader_sol_from.owner
    #[account(
        mut,
        token::mint = state.stader_sol_mint
    )]
    pub burn_stader_sol_from: Box<Account<'info, TokenAccount>>,

    pub burn_stader_sol_authority: Signer<'info>, // burn_stader_sol_from acc must be pre-delegated with enough amount to this key or input owner signature here

    #[account(
        zero,
        rent_exempt = enforce
    )]
    pub new_ticket_account: Box<Account<'info, TicketAccountData>>,

    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
}

impl<'info> OrderUnstake<'info> {
    // fn order_unstake() // create delayed-unstake Ticket-account
    pub fn process(&mut self, stader_sol_amount: u64) -> Result<()> {
        require!(!self.state.paused, StaderLiquidStakingError::ProgramIsPaused);

        check_token_source_account(
            &self.burn_stader_sol_from,
            self.burn_stader_sol_authority.key,
            stader_sol_amount,
        )
        .map_err(|e| e.with_account_name("burn_stader_sol_from"))?;
        let ticket_beneficiary = self.burn_stader_sol_from.owner;
        let user_stader_sol_balance = self.burn_stader_sol_from.amount;

        // save staderSOL price source
        let total_virtual_staked_lamports = self.state.total_virtual_staked_lamports();
        let stader_sol_supply = self.state.stader_sol_supply;

        let sol_value_of_stader_sol_burned = self.state.stader_sol_to_sol(stader_sol_amount)?;
        // apply delay_unstake_fee to avoid economical attacks
        // delay_unstake_fee must be >= one epoch staking rewards
        let delay_unstake_fee_lamports = self
            .state
            .delayed_unstake_fee
            .apply(sol_value_of_stader_sol_burned);
        // the fee value will be burned but not delivered, thus increasing staderSOL value slightly for all staderSOL holders
        let lamports_for_user = sol_value_of_stader_sol_burned - delay_unstake_fee_lamports;

        require_gte!(
            lamports_for_user,
            self.state.min_withdraw,
            StaderLiquidStakingError::WithdrawAmountIsTooLow
        );

        // record for event and then update
        let circulating_ticket_balance = self.state.circulating_ticket_balance;
        let circulating_ticket_count = self.state.circulating_ticket_count;
        // circulating_ticket_balance +
        self.state.circulating_ticket_balance += lamports_for_user;
        self.state.circulating_ticket_count += 1;

        // burn staderSOL
        burn(
            CpiContext::new(
                self.token_program.to_account_info(),
                Burn {
                    mint: self.stader_sol_mint.to_account_info(),
                    from: self.burn_stader_sol_from.to_account_info(),
                    authority: self.burn_stader_sol_authority.to_account_info(),
                },
            ),
            stader_sol_amount,
        )?;
        self.state.on_stader_sol_burn(stader_sol_amount);

        // initialize new_ticket_account
        let created_epoch = self.clock.epoch
            + if self.clock.epoch == self.state.stake_system.last_stake_delta_epoch {
                1
            } else {
                0
            };
        self.new_ticket_account.set_inner(TicketAccountData {
            state_address: self.state.key(),
            beneficiary: ticket_beneficiary,
            lamports_amount: lamports_for_user,
            created_epoch,
        });
        emit!(OrderUnstakeEvent {
            state: self.state.key(),
            ticket_epoch: created_epoch,
            ticket: self.new_ticket_account.key(),
            beneficiary: ticket_beneficiary,
            user_stader_sol_balance,
            circulating_ticket_count,
            circulating_ticket_balance,
            burned_stader_sol_amount: stader_sol_amount,
            sol_amount: lamports_for_user,
            fee_bp_cents: self.state.delayed_unstake_fee.bp_cents,
            total_virtual_staked_lamports,
            stader_sol_supply,
        });

        Ok(())
    }
}
