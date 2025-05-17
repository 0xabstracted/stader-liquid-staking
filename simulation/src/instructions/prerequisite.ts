import { 
    Connection, 
    sendAndConfirmTransaction, 
    Signer, 
    SystemProgram, 
    Transaction 
} from "@solana/web3.js";
import { 
    ASSOCIATED_TOKEN_PROGRAM_ID, 
    getAssociatedTokenAddressSync, 
    TOKEN_2022_PROGRAM_ID, 
    TOKEN_PROGRAM_ID 
} from "@solana/spl-token";
import { 
    createAtaTx, 
    createMintTransaction,
} from "../utils";
import { StaderSolInitParam } from "../types";
import { 
    lpMint, 
    lpMintKeypair, 
    operationalSolAccountKeypair, 
    staderSolMint, 
    staderSolMintKeypair, 
    stakeListKeypair, 
    stateAccountKeypair, 
    validatorsListKeypair,
    authorityStaderSolAcc,
    authorityLpAcc,
    reservePda,
    solLegPda,
    authorityStaderSolLegAcc,
    stakeDepositAuthority,
    stakeWithdrawAuthority,
    treasuryStaderSolAccount,
    staderSolLeg,
    stakeList,
    operationalSolAccount,
    stateAccount,
    validatorsList,
} from "../config";
   

export const preRequisiteSetup = async (connection: Connection, payer: Signer): Promise<StaderSolInitParam> => {
    const tx = new Transaction()

    const staderSolMintTx = await createMintTransaction(connection, payer, authorityStaderSolAcc, null, 9, staderSolMintKeypair)
    const lpMintTx = await createMintTransaction(connection, payer, authorityLpAcc, null, 9, lpMintKeypair)

    tx.add(staderSolMintTx)
    tx.add(lpMintTx)

    const treasuryStaderSolAccountTx = await createAtaTx(connection, payer, staderSolMint, stateAccount, {}, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, true)
    const staderSolLegTx = await createAtaTx(connection, payer, staderSolMint, authorityStaderSolLegAcc, {}, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, true)
    const payerStaderSolTokenAccountTx = await createAtaTx(connection, payer, staderSolMint, payer.publicKey, {}, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)
    const payerLpTokenAccountTx = await createAtaTx(connection, payer, lpMint, payer.publicKey, {}, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)

    tx.add(treasuryStaderSolAccountTx)
      .add(staderSolLegTx)
      .add(payerStaderSolTokenAccountTx)
      .add(payerLpTokenAccountTx)

    if (await connection.getBalance(reservePda) != 2_039_280) {
        tx.add(
            SystemProgram.transfer({
                fromPubkey: payer.publicKey,
                toPubkey: reservePda,
                lamports: 2_039_280,
            }),
        )
    }
    if (await connection.getBalance(solLegPda) != 2_039_280) {
        tx.add(
            SystemProgram.transfer({
                fromPubkey: payer.publicKey,
                toPubkey: solLegPda,
                lamports: 2_039_280,
            }),
        )
    };

    tx.feePayer = payer.publicKey
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

    const serialized = tx.serialize({
        verifySignatures: false,
        requireAllSignatures: false,
    })

    const size = serialized.length + 1 + (tx.signatures.length * 64);
    console.log("tx size : ", size);

    try {
        const sig = await sendAndConfirmTransaction(
            connection,
            tx,
            [
                payer,
                staderSolMintKeypair,
                lpMintKeypair
            ]
        )
        console.log("PreRequisite : ", sig);
    } catch (error) {
        console.log("Already initialized all the accounts : ", error);
    }

    const returnValue: StaderSolInitParam = {
        stateAccount: stateAccount,
        stakeList: stakeList,
        validatorList: validatorsList,
        operationalSolAccount: operationalSolAccount,
        authorityStaderSolAcc: authorityStaderSolAcc,
        authorityLpAcc: authorityLpAcc,
        reservePda: reservePda,
        solLegPda: solLegPda,
        authorityStaderSolLegAcc: authorityStaderSolLegAcc,
        stakeDepositAuthority: stakeDepositAuthority,
        stakeWithdrawAuthority: stakeWithdrawAuthority,
        staderSolMint: staderSolMint,
        lpMint: lpMint,
        treasuryStaderSolAccount: treasuryStaderSolAccount,
        staderSolLeg: staderSolLeg,
    }
    
    console.log("stateAccount:", stateAccount.toBase58());
    console.log("stakeList:", stakeList.toBase58());
    console.log("validatorsList:", validatorsList.toBase58());
    console.log("operationalSolAccount:", operationalSolAccount.toBase58());
    console.log("authorityStaderSolAcc:", authorityStaderSolAcc.toBase58());
    console.log("authorityLpAcc:", authorityLpAcc.toBase58());
    console.log("reservePda:", reservePda.toBase58());
    console.log("solLegPda:", solLegPda.toBase58());
    console.log("authorityStaderSolLegAcc:", authorityStaderSolLegAcc.toBase58());
    console.log("stakeDepositAuthority:", stakeDepositAuthority.toBase58());
    console.log("stakeWithdrawAuthority:", stakeWithdrawAuthority.toBase58());
    console.log("staderSolMint:", staderSolMint.toBase58());
    console.log("lpMint:", lpMint.toBase58());
    console.log("treasuryStaderSolAccount:", treasuryStaderSolAccount.toBase58());
    console.log("staderSolLeg:", staderSolLeg.toBase58());
    
    return returnValue
}
