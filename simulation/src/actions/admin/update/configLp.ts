import { 
    connectionDevnet as connection,
    // connection, 
    admin, 
} from "../../../config";
import { BN } from "@coral-xyz/anchor";
import { ConfigStaderParam } from "../../../types";
import { configStader } from "../../../instructions/baseInstructions/admin/06_configStader";

const configLpParams = async () => {
    const configStaderParam : ConfigStaderParam = {
        rewardsFee: { basisPoints: 0 },
        slotsForStakeDelta: new BN (3000),  //18_000 for marinade
        minStake: new BN (10000000), //1_000_000_000 for marinade
        //extra stake delta runs 150 for marinade
        //extra stake delta runs 0 for stader
        minDeposit: new BN (1),
        minWithdraw: new BN (1),
        stakingSolCap: new BN (18446744073709551615),
        liquiditySolCap: new BN (18446744073709551615),
        // lpLiquidityTarget 50_000_000_000 for stader
        // lpLiquidityTarget 21_000_000_000_000 for marinade
        // lpMaxFee 900 for marinade
        // lpMinFee 1 for marinade
        // treasuryCut 5000 for marinade
        // lpMaxFee 10 for stader
        // lpMinFee 1 for stader
        // treasuryCut 1 for stader
        withdrawStakeAccountEnabled: false,
        // withdrawStakeAccountEnabled true for marinade
        delayedUnstakeFee: { bpCents: 0 },
        withdrawStakeAccountFee: { bpCents: 0 },
        // withdrawStakeAccountFee 1500 for marinade
        maxStakeMovedPerEpoch: { basisPoints: 10000 },
    };

    await configStader(connection, admin, configStaderParam)
}

configLpParams().then(() => {
    console.log("Config Lp completed")
}).catch((err) => {
    console.log("Error in configLp : ", err)
})