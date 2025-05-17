use anchor_lang::prelude::*;

use crate::state::Fee;

#[event]
pub struct AddLiquidityEvent {
    pub state: Pubkey,
    pub sol_owner: Pubkey,
    pub user_sol_balance: u64,
    pub user_lp_balance: u64,
    pub sol_leg_balance: u64,
    pub lp_supply: u64,
    pub sol_added_amount: u64,
    pub lp_minted: u64,
    // staderSOLprice used
    pub total_virtual_staked_lamports: u64,
    pub stader_sol_supply: u64,
}

#[event]
pub struct LiquidUnstakeEvent {
    pub state: Pubkey,
    pub stader_sol_owner: Pubkey,
    pub liq_pool_sol_balance: u64,
    pub liq_pool_stader_sol_balance: u64,
    pub treasury_stader_sol_balance: Option<u64>,
    pub user_stader_sol_balance: u64,
    pub user_sol_balance: u64,
    pub stader_sol_amount: u64,
    pub stader_sol_fee: u64,
    pub treasury_stader_sol_cut: u64,
    pub sol_amount: u64,
    // params used
    pub lp_liquidity_target: u64,
    pub lp_max_fee: Fee,
    pub lp_min_fee: Fee,
    pub treasury_cut: Fee,
}

#[event]
pub struct RemoveLiquidityEvent {
    pub state: Pubkey,
    pub sol_leg_balance: u64,
    pub stader_sol_leg_balance: u64,
    pub user_lp_balance: u64,
    pub user_sol_balance: u64,
    pub user_stader_sol_balance: u64,
    pub lp_mint_supply: u64,
    pub lp_burned: u64,
    pub sol_out_amount: u64,
    pub stader_sol_out_amount: u64,
}
