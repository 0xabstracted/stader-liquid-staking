use anchor_lang::prelude::*;

use crate::{
    error::StaderLiquidStakingError,
    events::admin::{EmergencyPauseEvent, ResumeEvent},
    State,
};

// this account struct is used for pause() and resume() instructions (see lib.rs)
#[derive(Accounts)]
pub struct EmergencyPause<'info> {
    #[account(
        mut,
        has_one = pause_authority @ StaderLiquidStakingError::InvalidPauseAuthority
    )]
    pub state: Account<'info, State>,
    pub pause_authority: Signer<'info>,
}

impl<'info> EmergencyPause<'info> {
    pub fn pause(&mut self) -> Result<()> {
        require!(!self.state.paused, StaderLiquidStakingError::AlreadyPaused);
        self.state.paused = true;
        emit!(EmergencyPauseEvent {
            state: self.state.key(),
        });

        Ok(())
    }

    pub fn resume(&mut self) -> Result<()> {
        require!(self.state.paused, StaderLiquidStakingError::NotPaused);
        self.state.paused = false;
        emit!(ResumeEvent {
            state: self.state.key(),
        });
        Ok(())
    }
}
