
import { 
    Connection, 
    Keypair, 
    sendAndConfirmTransaction, 
    Signer 
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { 
    programDevnet as program,
    // program,
    stateAccount, 
    staderSolMint,
} from "../../../config";
import { OrderUnstakeParam } from "../../../types/basicInstructionTypes/user";

export const orderUnstake = async (connection: Connection, user: Signer, orderUnstakeParam: OrderUnstakeParam) => {
    const {
        staderSolAmount 
    } = orderUnstakeParam;

    const userStaderSolTokenAccount = getAssociatedTokenAddressSync(staderSolMint, user.publicKey);
    const newTicketAccountKeypair = new Keypair();

    const tx = await program.methods.orderUnstake(staderSolAmount)
        .accounts({
            state: stateAccount,
            staderSolMint: staderSolMint,
            burnStaderSolFrom: userStaderSolTokenAccount,
            burnStaderSolAuthority: user.publicKey,
            newTicketAccount: newTicketAccountKeypair.publicKey,
        })
        .signers([user])
        .transaction()

    // Set fee payer and recent blockhash
    tx.feePayer = user.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    try{
        // Simulate the transaction to catch errors
        // const simulationResult = await connection.simulateTransaction(tx);
        // console.log("deposit: Simulation Result:", simulationResult);

        // Send the transaction
        const sig = await sendAndConfirmTransaction(connection, tx, [user], {skipPreflight: true});
        console.log("order unstake: Transaction Signature:", sig);
        const state = await program.account.state.fetch(stateAccount);
        console.log("State Account after ordered Unstake:", state);
    } catch(error) {
        console.log("Error in ordered unstake: ", error);
    }
}