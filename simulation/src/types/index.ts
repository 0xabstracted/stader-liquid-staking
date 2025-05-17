import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

import {
    InitializeDataParam,
    AddValidatorParam,
    DepositParam,
    DepositNewStakeParam,
    DepositExistingStakeParam,
    OrderUnstakeParam,
    ClaimParam,
    WithdrawStakeAccountParam,
    ChangeAuthorityData,
    RemoveValidatorParam,
    SetValidatorScore,
    ConfigValidatorSystem,
    LiquidUnstakeParam,
    AddLiquidityParam,
    RemoveLiquidityParam,
    ConfigLpParam,
    ConfigStaderParam,
} from "./basicInstructionTypes"

import {
    StakeReserveParam,
    UpdateActiveParam,
    UpdateDeactivatedParam,
    DeactivateStakeParam,
    MergeStakeParam,
    RedelegateParam,
    EmergencyUnstakeParam,
    PartialUnstakeParam,
    ReallocStakeListParam,
    ReallocValidatorListParam,
} from "./advancedInstructionTypes"

interface StaderSolInitParam {
    stateAccount: PublicKey,
    stakeList: PublicKey,
    validatorList: PublicKey,
    operationalSolAccount: PublicKey,
    authorityStaderSolAcc: PublicKey,
    authorityLpAcc: PublicKey,
    reservePda: PublicKey,
    solLegPda: PublicKey,
    authorityStaderSolLegAcc: PublicKey,
    stakeDepositAuthority: PublicKey,
    stakeWithdrawAuthority: PublicKey,
    staderSolMint: PublicKey,
    lpMint: PublicKey,
    treasuryStaderSolAccount: PublicKey,
    staderSolLeg: PublicKey,
}

interface ParsedStakeAccountInfo {
    address: PublicKey
    ownerAddress: PublicKey
    authorizedStakerAddress: PublicKey | null
    authorizedWithdrawerAddress: PublicKey | null
    voterAddress: PublicKey | null
    activationEpoch: BN | null
    deactivationEpoch: BN | null
    isCoolingDown: boolean
    isLockedUp: boolean
    balanceLamports: BN | null
    stakedLamports: BN | null
}

export {
    StaderSolInitParam,
    InitializeDataParam,
    ChangeAuthorityData,
    AddValidatorParam,
    RemoveValidatorParam,
    DepositParam,
    DepositNewStakeParam,
    DepositExistingStakeParam,
    SetValidatorScore,
    ConfigValidatorSystem,
    LiquidUnstakeParam,
    AddLiquidityParam,
    RemoveLiquidityParam,
    ConfigLpParam,
    ConfigStaderParam,
    OrderUnstakeParam,
    ClaimParam,
    StakeReserveParam,
    UpdateActiveParam,
    UpdateDeactivatedParam,
    DeactivateStakeParam,
    ParsedStakeAccountInfo,
    EmergencyUnstakeParam,
    PartialUnstakeParam,
    MergeStakeParam,
    RedelegateParam,
    WithdrawStakeAccountParam,
    ReallocStakeListParam,
    ReallocValidatorListParam,
}