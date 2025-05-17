use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::token::{
    mint_to, transfer as transfer_tokens, Mint, MintTo, Token, TokenAccount,
    Transfer as TransferTokens,
};

use crate::error::StaderLiquidStakingError;
use crate::events::user::DepositEvent;
use crate::state::liq_pool::LiqPool;
use crate::{require_lte, State};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        has_one = stader_sol_mint
    )]
    pub state: Box<Account<'info, State>>,

    #[account(mut)]
    pub stader_sol_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [
            &state.key().to_bytes(),
            LiqPool::SOL_LEG_SEED
        ],
        bump = state.liq_pool.sol_leg_bump_seed
    )]
    pub liq_pool_sol_leg_pda: SystemAccount<'info>,

    #[account(
        mut,
        address = state.liq_pool.stader_sol_leg
    )]
    pub liq_pool_stader_sol_leg: Box<Account<'info, TokenAccount>>,
    /// CHECK: PDA
    #[account(
        seeds = [
            &state.key().to_bytes(),
            LiqPool::STADER_SOL_LEG_AUTHORITY_SEED
        ],
        bump = state.liq_pool.stader_sol_leg_authority_bump_seed
    )]
    pub liq_pool_stader_sol_leg_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            &state.key().to_bytes(),
            State::RESERVE_SEED
        ],
        bump = state.reserve_bump_seed
    )]
    pub reserve_pda: SystemAccount<'info>,

    #[account(
        mut,
        owner = system_program::ID
    )]
    pub transfer_from: Signer<'info>,

    /// user staderSOL Token account to send the staderSOL
    #[account(
        mut,
        token::mint = state.stader_sol_mint
    )]
    pub mint_to: Box<Account<'info, TokenAccount>>,

    /// CHECK: PDA
    #[account(
        seeds = [
            &state.key().to_bytes(),
            State::STADER_SOL_MINT_AUTHORITY_SEED
        ],
        bump = state.stader_sol_mint_authority_bump_seed
    )]
    pub stader_sol_mint_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> Deposit<'info> {
    // fn deposit_sol()
    pub fn process(&mut self, lamports: u64) -> Result<()> {
        require!(!self.state.paused, StaderLiquidStakingError::ProgramIsPaused);

        require_gte!(
            lamports,
            self.state.min_deposit,
            StaderLiquidStakingError::DepositAmountIsTooLow
        );
        let user_sol_balance = self.transfer_from.lamports();
        require_gte!(
            user_sol_balance,
            lamports,
            StaderLiquidStakingError::NotEnoughUserFunds
        );

        // store for event log
        let user_stader_sol_balance = self.mint_to.amount;
        let reserve_balance = self.reserve_pda.lamports();
        let sol_leg_balance = self.liq_pool_sol_leg_pda.lamports();

        // impossible to happen check outside bug (staderSOL mint auth is a PDA)
        require_lte!(
            self.stader_sol_mint.supply,
            self.state.stader_sol_supply,
            StaderLiquidStakingError::UnregisteredStaderSolMinted
        );

        let total_virtual_staked_lamports = self.state.total_virtual_staked_lamports();
        let stader_sol_supply = self.state.stader_sol_supply;

        //compute how many staderSOL to sell/mint for the user, base on how many lamports being deposited
        let user_stader_sol_buy_order = self.state.calc_stader_sol_from_lamports(lamports)?;
        msg!("--- user_s_sol_buy_order {}", user_stader_sol_buy_order);

        //First we try to "sell" staderSOL to the user from the LiqPool.
        //The LiqPool needs to get rid of their staderSOL because it works better if fully "unbalanced", i.e. with all SOL no staderSOL
        //so, if we can, the LiqPool "sells" staderSOL to the user (no fee)
        //
        // At max, we can sell all the staderSOL in the LiqPool.staderSOL_leg
        let stader_sol_leg_balance = self.liq_pool_stader_sol_leg.amount;
        let stader_sol_swapped: u64 = user_stader_sol_buy_order.min(stader_sol_leg_balance);
        msg!("--- swap_s_sol_max {}", stader_sol_swapped);

        //if we can sell from the LiqPool
        let sol_swapped = if stader_sol_swapped > 0 {
            // how much lamports go into the LiqPool?
            let sol_swapped = if user_stader_sol_buy_order == stader_sol_swapped {
                //we are fulfilling 100% the user order
                lamports //100% of the user deposit
            } else {
                // partially filled
                // then it's the lamport value of the tokens we're selling
                self.state.stader_sol_to_sol(stader_sol_swapped)?
            };

            // transfer staderSOL to the user

            transfer_tokens(
                CpiContext::new_with_signer(
                    self.token_program.to_account_info(),
                    TransferTokens {
                        from: self.liq_pool_stader_sol_leg.to_account_info(),
                        to: self.mint_to.to_account_info(),
                        authority: self.liq_pool_stader_sol_leg_authority.to_account_info(),
                    },
                    &[&[
                        &self.state.key().to_bytes(),
                        LiqPool::STADER_SOL_LEG_AUTHORITY_SEED,
                        &[self.state.liq_pool.stader_sol_leg_authority_bump_seed],
                    ]],
                ),
                stader_sol_swapped,
            )?;

            // transfer lamports to the LiqPool
            transfer(
                CpiContext::new(
                    self.system_program.to_account_info(),
                    Transfer {
                        from: self.transfer_from.to_account_info(),
                        to: self.liq_pool_sol_leg_pda.to_account_info(),
                    },
                ),
                sol_swapped,
            )?;

            sol_swapped
            //end of sale from the LiqPool
        } else {
            0
        };

        // check if we have more lamports from the user besides the amount we swapped
        let sol_deposited = lamports - sol_swapped;
        if sol_deposited > 0 {
            self.state.check_staking_cap(sol_deposited)?;

            // transfer sol_deposited to reserve
            transfer(
                CpiContext::new(
                    self.system_program.to_account_info(),
                    Transfer {
                        from: self.transfer_from.to_account_info(),
                        to: self.reserve_pda.to_account_info(),
                    },
                ),
                sol_deposited,
            )?;
            self.state.on_transfer_to_reserve(sol_deposited);
        }

        // compute how much staderSOL we own the user besides the amount we already swapped
        let stader_sol_minted = user_stader_sol_buy_order - stader_sol_swapped;
        if stader_sol_minted > 0 {
            msg!("--- stader_sol_to_mint {}", stader_sol_minted);
            mint_to(
                CpiContext::new_with_signer(
                    self.token_program.to_account_info(),
                    MintTo {
                        mint: self.stader_sol_mint.to_account_info(),
                        to: self.mint_to.to_account_info(),
                        authority: self.stader_sol_mint_authority.to_account_info(),
                    },
                    &[&[
                        &self.state.key().to_bytes(),
                        State::STADER_SOL_MINT_AUTHORITY_SEED,
                        &[self.state.stader_sol_mint_authority_bump_seed],
                    ]],
                ),
                stader_sol_minted,
            )?;
            self.state.on_stader_sol_mint(stader_sol_minted);
        }

        emit!(DepositEvent {
            state: self.state.key(),
            sol_owner: self.transfer_from.key(),
            user_sol_balance,
            user_stader_sol_balance,
            sol_leg_balance,
            stader_sol_leg_balance,
            reserve_balance,
            sol_swapped,
            stader_sol_swapped,
            sol_deposited,
            stader_sol_minted,
            total_virtual_staked_lamports,
            stader_sol_supply
        });

        Ok(())
    }
}
