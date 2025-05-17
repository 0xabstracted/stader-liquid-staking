use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::token::{
    transfer as transfer_token, Mint, Token, TokenAccount, Transfer as TransferToken,
};

use crate::{
    checks::check_token_source_account, events::liq_pool::LiquidUnstakeEvent,
    state::liq_pool::LiqPool, StaderLiquidStakingError, State,
};

#[derive(Accounts)]
pub struct LiquidUnstake<'info> {
    #[account(
        mut,
        has_one = treasury_stader_sol_account,
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

    /// CHECK: deserialized in code, must be the one in State (State has_one treasury_stader_sol_account)
    #[account(mut)]
    pub treasury_stader_sol_account: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = state.stader_sol_mint
    )]
    pub get_stader_sol_from: Box<Account<'info, TokenAccount>>,
    pub get_stader_sol_from_authority: Signer<'info>, //burn_stader_sol_from owner or delegate_authority

    #[account(mut)]
    pub transfer_sol_to: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> LiquidUnstake<'info> {
    // fn liquid_unstake()
    pub fn process(&mut self, stader_sol_amount: u64) -> Result<()> {
        require!(!self.state.paused, StaderLiquidStakingError::ProgramIsPaused);

        check_token_source_account(
            &self.get_stader_sol_from,
            self.get_stader_sol_from_authority.key,
            stader_sol_amount,
        )
        .map_err(|e| e.with_account_name("get_stader_sol_from"))?;
        let user_sol_balance = self.transfer_sol_to.lamports();
        let user_stader_sol_balance = self.get_stader_sol_from.amount;
        let treasury_stader_sol_balance = self
            .state
            .get_treasury_stader_sol_balance(&self.treasury_stader_sol_account);

        let liq_pool_stader_sol_balance = self.liq_pool_stader_sol_leg.amount;
        let liq_pool_sol_balance = self.liq_pool_sol_leg_pda.lamports();
        let liq_pool_available_sol_balance =
            liq_pool_sol_balance.saturating_sub(self.state.rent_exempt_for_token_acc);

        // fee is computed based on the liquidity *after* the user takes the sol
        let user_remove_lamports = self.state.stader_sol_to_sol(stader_sol_amount)?;
        let liquid_unstake_fee = if user_remove_lamports >= liq_pool_available_sol_balance {
            // user is removing all liquidity
            self.state.liq_pool.lp_max_fee
        } else {
            let after_lamports = liq_pool_available_sol_balance - user_remove_lamports; //how much will be left?
            self.state.liq_pool.linear_fee(after_lamports)
        };

        // compute fee in staderSOL
        let stader_sol_fee = liquid_unstake_fee.apply(stader_sol_amount);
        msg!("stader_sol_fee {}", stader_sol_fee);

        // fee goes into treasury & LPs, so the user receives lamport value of data.stader_sol_amount - stader_sol_fee
        // compute how many lamports the stader_sol_amount the user is "selling" (minus fee) is worth
        let working_lamports_value = self.state.stader_sol_to_sol(stader_sol_amount - stader_sol_fee)?;

        // it can't be more than what's in the LiqPool
        if working_lamports_value + self.state.rent_exempt_for_token_acc
            > self.liq_pool_sol_leg_pda.lamports()
        {
            return err!(StaderLiquidStakingError::InsufficientLiquidity);
        }

        require_gte!(
            working_lamports_value,
            self.state.min_withdraw,
            StaderLiquidStakingError::WithdrawAmountIsTooLow
        );

        //transfer SOL from the liq-pool to the user
        if working_lamports_value > 0 {
            transfer(
                CpiContext::new_with_signer(
                    self.system_program.to_account_info(),
                    Transfer {
                        from: self.liq_pool_sol_leg_pda.to_account_info(),
                        to: self.transfer_sol_to.to_account_info(),
                    },
                    &[&[
                        &self.state.key().to_bytes(),
                        LiqPool::SOL_LEG_SEED,
                        &[self.state.liq_pool.sol_leg_bump_seed],
                    ]],
                ),
                working_lamports_value,
            )?;
        }

        // cut 25% from the fee for the treasury
        let treasury_stader_sol_cut = if treasury_stader_sol_balance.is_some() {
            self.state.liq_pool.treasury_cut.apply(stader_sol_fee)
        } else {
            0
        };
        msg!("treasury_stader_sol_cut {}", treasury_stader_sol_cut);

        //transfer staderSOL to the liq-pool
        transfer_token(
            CpiContext::new(
                self.token_program.to_account_info(),
                TransferToken {
                    from: self.get_stader_sol_from.to_account_info(),
                    to: self.liq_pool_stader_sol_leg.to_account_info(),
                    authority: self.get_stader_sol_from_authority.to_account_info(),
                },
            ),
            stader_sol_amount - treasury_stader_sol_cut,
        )?;

        //transfer treasury cut to treasury_stader_sol_account
        if treasury_stader_sol_cut > 0 {
            transfer_token(
                CpiContext::new(
                    self.token_program.to_account_info(),
                    TransferToken {
                        from: self.get_stader_sol_from.to_account_info(),
                        to: self.treasury_stader_sol_account.to_account_info(),
                        authority: self.get_stader_sol_from_authority.to_account_info(),
                    },
                ),
                treasury_stader_sol_cut,
            )?;
        }

        emit!(LiquidUnstakeEvent {
            state: self.state.key(),
            stader_sol_owner: self.get_stader_sol_from.owner,
            stader_sol_amount,
            liq_pool_sol_balance,
            liq_pool_stader_sol_balance,
            treasury_stader_sol_balance,
            user_stader_sol_balance,
            user_sol_balance,
            stader_sol_fee,
            treasury_stader_sol_cut,
            sol_amount: working_lamports_value,
            lp_liquidity_target: self.state.liq_pool.lp_liquidity_target,
            lp_max_fee: self.state.liq_pool.lp_max_fee,
            lp_min_fee: self.state.liq_pool.lp_min_fee,
            treasury_cut: self.state.liq_pool.treasury_cut
        });

        Ok(())
    }
}
