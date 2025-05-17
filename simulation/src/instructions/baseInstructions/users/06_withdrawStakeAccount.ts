
import { 
    Connection, 
    Keypair, 
    sendAndConfirmTransaction, 
    Signer, 
    StakeProgram, 
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { 
    programDevnet as program,
    // program,
} from "../../../config";
import { WithdrawStakeAccountParam } from "../../../types";
import { 
    staderSolMint,
    stateAccount,
    treasuryStaderSolAccount,
    validatorsList,
    stakeList,
    stakeWithdrawAuthority,
    stakeDepositAuthority,
} from "../../../config";

export const withdrawStakeAccount = async (connection: Connection, user: Signer, stakeAccount: Keypair, withdrawStakeAccountParam: WithdrawStakeAccountParam) => {
    const {
        stakeIndex,
        validatorIndex,
        staderSolAmount,
        beneficiary,
        splitStakeAccount
    } = withdrawStakeAccountParam
    
    const burnStaderSolFrom = getAssociatedTokenAddressSync(staderSolMint, user.publicKey)

    const tx = await program.methods.withdrawStakeAccount(
        stakeIndex,
        validatorIndex,
        staderSolAmount,
        beneficiary
    ).accounts({
        state: stateAccount,
        staderSolMint: staderSolMint,
        burnStaderSolFrom: burnStaderSolFrom,
        burnStaderSolAuthority: user.publicKey,
        treasuryStaderSolAccount: treasuryStaderSolAccount,
        validatorList: validatorsList,
        stakeList: stakeList,
        stakeWithdrawAuthority: stakeWithdrawAuthority,
        stakeDepositAuthority: stakeDepositAuthority,
        stakeAccount: stakeAccount.publicKey,
        splitStakeAccount: splitStakeAccount.publicKey,
        splitStakeRentPayer: user.publicKey,
        stakeProgram: StakeProgram.programId,
    })
        .signers([user])
        .transaction()
    // Set fee payer and recent blockhash
    tx.feePayer = user.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    // Simulate the transaction to catch errors
    // const simulationResult = await connection.simulateTransaction(tx);
    // console.log("Simulation Result:", simulationResult);
    // Send the transaction
    const sig = await sendAndConfirmTransaction(connection, tx, [user, splitStakeAccount], {skipPreflight: true});
    console.log("Transaction Signature:", sig);
}

//? Define the parameters for initializing the state
// const initializeData : InitializeDataParam = {
//     adminAuthority: authorityAcc.publicKey,
//     validatorManagerAuthority: user.publicKey,
//     minStake: new BN(10000000), // Example value
//     rewardsFee: { numerator: 1, denominator: 100 }, // 1%
//     liqPool: {
//         lpLiquidityTarget: new BN(50000000000),
//         lpMaxFee: { basisPoints: new BN(1) },
//         lpMinFee: { basisPoints: new BN(1) },
//         lpTreasuryCut: { basisPoints: new BN(1) },
//     },
//     additionalStakeRecordSpace: 3,
//     additionalValidatorRecordSpace: 3,
//     slotsForStakeDelta: new BN(3000),
//     pauseAuthority: user.publicKey,
// };